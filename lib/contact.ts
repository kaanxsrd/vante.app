import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import nodemailer from 'nodemailer';

/**
 * Server-only helpers for the contact form. A message is only delivered after the sender proves
 * they can read mail at the address they typed: /api/contact/verify mails a 6-digit code and hands
 * back a signed token, and /api/contact checks the code against that token before sending.
 *
 * The token is stateless (HMAC-signed, no database), so it works across serverless instances. It
 * carries a hash of the code, never the code itself.
 */

export const CODE_TTL_MS = 1000 * 60 * 10;
export const LIMITS = { name: 100, email: 254, message: 2000 } as const;

const secret = createHash('sha256')
  .update(process.env.CONTACT_TOKEN_SECRET || `contact:${process.env.SMTP_PASS ?? ''}`)
  .digest();

// ---------------------------------------------------------------------------------------------
// Rate limiting (in memory, per instance — a speed bump, not a guarantee)

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
  );
}

// ---------------------------------------------------------------------------------------------
// Email address checks

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'discard.email',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'fakemail.net',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mail.tm',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'moakt.com',
  'sharklasers.com',
  'spamgourmet.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'yopmail.net',
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isWellFormedEmail(email: string): boolean {
  return email.length <= LIMITS.email && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);
}

const resolver = new Resolver({ timeout: 3000, tries: 2 });

export type DomainCheck = 'ok' | 'disposable' | 'no-mail' | 'unknown';

/** Does the address's domain accept mail at all? A made-up domain has no MX record. */
export async function checkEmailDomain(email: string): Promise<DomainCheck> {
  const domain = email.split('@')[1] ?? '';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'disposable';
  try {
    const records = await resolver.resolveMx(domain);
    // A "null MX" (RFC 7505) is a single record with an empty exchange: the domain takes no mail.
    const usable = records.filter((r) => r.exchange && r.exchange !== '.');
    return usable.length > 0 ? 'ok' : 'no-mail';
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') return 'no-mail';
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------------------------
// Verification codes and tokens

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function sign(value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function codeHash(email: string, code: string, expiresAt: number): string {
  return sign(`code:${email}:${code}:${expiresAt}`);
}

export function createToken(email: string, code: string): string {
  const expiresAt = Date.now() + CODE_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ e: email, h: codeHash(email, code, expiresAt), x: expiresAt }),
  ).toString('base64url');
  return `${payload}.${sign(`token:${payload}`)}`;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Best effort: a token that already sent a message is refused by this instance until it expires.
const usedTokens = new Map<string, number>();

export type TokenCheck = 'ok' | 'invalid' | 'expired' | 'wrong-code' | 'used';

export function checkToken(token: string, email: string, code: string): TokenCheck {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(`token:${payload}`))) return 'invalid';

  let data: { e?: unknown; h?: unknown; x?: unknown };
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return 'invalid';
  }
  if (typeof data.e !== 'string' || typeof data.h !== 'string' || typeof data.x !== 'number') {
    return 'invalid';
  }
  if (data.e !== email) return 'invalid';
  if (Date.now() > data.x) return 'expired';
  if (!safeEqual(data.h, codeHash(email, code, data.x))) return 'wrong-code';

  const now = Date.now();
  for (const [t, exp] of usedTokens) if (exp <= now) usedTokens.delete(t);
  if (usedTokens.has(signature)) return 'used';
  return 'ok';
}

export function markTokenUsed(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return;
  try {
    const { x } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    usedTokens.set(signature, typeof x === 'number' ? x : Date.now() + CODE_TTL_MS);
  } catch {}
}

// ---------------------------------------------------------------------------------------------
// Mail

export function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(content: string, footer: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width: 520px; width: 100%;">
              <tr>
                <td style="background-color: #111113; border: 1px solid #1e1e24; border-radius: 16px; overflow: hidden;">
                  <div style="height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);"></div>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding: 32px 28px 28px;">
                    ${content}
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top: 28px;">
                  <p style="font-size: 12px; color: #4a4a57; margin: 0; line-height: 1.6;">${footer}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/** Mailed to the visitor. Contains nothing they typed, so it can't be used to relay spam. */
export function verificationMail(code: string) {
  const minutes = CODE_TTL_MS / 60_000;
  return {
    subject: `${code} is your vante.app verification code`,
    text: `Your verification code is ${code}.\n\nEnter it on vante.app/contact to send your message. It expires in ${minutes} minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: layout(
      `
        <tr>
          <td style="padding-bottom: 20px;">
            <div style="font-size: 16px; font-weight: 600; color: #f1f5f9; line-height: 1.4;">Confirm your email address</div>
            <div style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-top: 6px;">Enter this code on the contact page to send your message to Kaan.</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 8px 0 20px;">
            <div style="display: inline-block; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #f1f5f9; background-color: #0a0a0c; border: 1px solid #1e1e24; border-radius: 12px; padding: 16px 24px 16px 34px; font-family: 'SFMono-Regular', Menlo, Consolas, monospace;">${code}</div>
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #64748b; line-height: 1.6;">
            The code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.
          </td>
        </tr>
      `,
      `Sent from the contact form on <a href="https://vante.app" style="color: #818cf8; text-decoration: none;">vante.app</a>`,
    ),
  };
}

/** Mailed to me once the sender's address is verified. */
export function contactMail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const initial = escapeHtml(name.charAt(0).toUpperCase());
  const firstName = escapeHtml(name.split(' ')[0] ?? name);

  return {
    subject: `Contact Form Message from ${name.replace(/[\r\n]+/g, ' ')}`,
    text: `Name: ${name}\nEmail: ${email} (verified)\nMessage:\n${message}`,
    html: layout(
      `
        <tr>
          <td style="padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="width: 48px; vertical-align: top;">
                  <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-align: center; line-height: 48px;">
                    <span style="font-size: 20px; font-weight: 600; color: #ffffff;">${initial}</span>
                  </div>
                </td>
                <td style="padding-left: 14px; vertical-align: middle;">
                  <div style="font-size: 16px; font-weight: 600; color: #f1f5f9; line-height: 1.3;">${safeName}</div>
                  <a href="mailto:${safeEmail}" style="font-size: 13px; color: #818cf8; text-decoration: none; line-height: 1.4;">${safeEmail}</a>
                  <span style="display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 600; color: #4ade80; background-color: #0f2a1a; border: 1px solid #14532d; border-radius: 999px; padding: 1px 8px; vertical-align: 1px;">&#10003; verified</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 24px;">
            <div style="height: 1px; background-color: #1e1e24;"></div>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #6366f1; margin-bottom: 12px;">Message</div>
            <div style="font-size: 15px; line-height: 1.7; color: #cbd5e1; background-color: #0a0a0c; border: 1px solid #1e1e24; border-radius: 10px; padding: 18px 20px;">${safeMessage}</div>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 28px;" align="center">
            <a href="mailto:${safeEmail}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #7c3aed); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px; letter-spacing: 0.2px;">Reply to ${firstName}</a>
          </td>
        </tr>
      `,
      `Sent from the contact form on <a href="https://vante.app" style="color: #818cf8; text-decoration: none;">vante.app</a>. The sender confirmed this address with a one-time code.`,
    ),
  };
}
