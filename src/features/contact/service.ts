export { isWellFormedEmail, LIMITS } from './validation';

import 'server-only';
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { type EmailBrand, emailLayout, escapeHtml } from '@/lib/email';
import { getEnv } from '@/lib/env';
import { consumeRateLimit, resetRateLimit } from '@/lib/rate-limit';

const CODE_TTL_MS = 10 * 60_000;

function secret(): Buffer {
  const env = getEnv();
  const value = env.CONTACT_TOKEN_SECRET ?? env.BETTER_AUTH_SECRET;
  if (!value) throw new Error('CONTACT_TOKEN_SECRET or BETTER_AUTH_SECRET must be set');
  return createHash('sha256').update(value).digest();
}

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

const resolver = new Resolver({ timeout: 3000, tries: 2 });

export type DomainCheck = 'ok' | 'disposable' | 'no-mail' | 'unknown';

export async function checkEmailDomain(email: string): Promise<DomainCheck> {
  const domain = email.split('@')[1] ?? '';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'disposable';
  try {
    const records = await resolver.resolveMx(domain);
    const usable = records.filter((record) => record.exchange && record.exchange !== '.');
    return usable.length > 0 ? 'ok' : 'no-mail';
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') return 'no-mail';
    return 'unknown';
  }
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
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
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type TokenCheck = 'ok' | 'invalid' | 'expired' | 'wrong-code';

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
  return 'ok';
}

const tokenClaimKey = (token: string) => `contact-token:${token.split('.')[1] ?? token}`;

export async function claimToken(token: string): Promise<boolean> {
  const claim = await consumeRateLimit({
    key: tokenClaimKey(token),
    limit: 1,
    windowMs: CODE_TTL_MS,
  });
  return claim.allowed;
}

export async function releaseToken(token: string): Promise<void> {
  await resetRateLimit(tokenClaimKey(token));
}

function contactFooter({ siteName, url }: EmailBrand): string {
  return `Sent from the contact form on <a href="${escapeHtml(url)}" style="color:#818cf8;text-decoration:none;">${escapeHtml(siteName)}</a>`;
}

export function verificationMail(code: string, brand: EmailBrand) {
  const minutes = CODE_TTL_MS / 60_000;
  return {
    subject: `${code} is your ${brand.siteName} verification code`,
    text: `Your verification code is ${code}.\n\nEnter it on ${brand.url}/contact to send your message. It expires in ${minutes} minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: emailLayout(
      `<tr><td style="padding-bottom:20px;">
          <div style="font-size:16px;font-weight:600;color:#f1f5f9;line-height:1.4;">Confirm your email address</div>
          <div style="font-size:14px;color:#94a3b8;line-height:1.6;margin-top:6px;">Enter this code on the contact page to send your message to ${escapeHtml(brand.ownerName)}.</div>
        </td></tr>
        <tr><td align="center" style="padding:8px 0 20px;">
          <div style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:10px;color:#f1f5f9;background-color:#0a0a0c;border:1px solid #1e1e24;border-radius:12px;padding:16px 24px 16px 34px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${code}</div>
        </td></tr>
        <tr><td style="font-size:13px;color:#64748b;line-height:1.6;">
          The code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.
        </td></tr>`,
      contactFooter(brand),
    ),
  };
}

export function contactMail(
  {
    name,
    email,
    message,
  }: {
    name: string;
    email: string;
    message: string;
  },
  brand: EmailBrand,
) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const initial = escapeHtml(name.charAt(0).toUpperCase());
  const firstName = escapeHtml(name.split(' ')[0] ?? name);

  return {
    subject: `Contact Form Message from ${name}`,
    text: `Name: ${name}\nEmail: ${email} (verified)\nMessage:\n${message}`,
    html: emailLayout(
      `<tr><td style="padding-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="width:48px;vertical-align:top;">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);text-align:center;line-height:48px;">
                <span style="font-size:20px;font-weight:600;color:#ffffff;">${initial}</span>
              </div>
            </td>
            <td style="padding-left:14px;vertical-align:middle;">
              <div style="font-size:16px;font-weight:600;color:#f1f5f9;line-height:1.3;">${safeName}</div>
              <a href="mailto:${safeEmail}" style="font-size:13px;color:#818cf8;text-decoration:none;line-height:1.4;">${safeEmail}</a>
              <span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:600;color:#4ade80;background-color:#0f2a1a;border:1px solid #14532d;border-radius:999px;padding:1px 8px;vertical-align:1px;">&#10003; verified</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding-bottom:24px;"><div style="height:1px;background-color:#1e1e24;"></div></td></tr>
        <tr><td>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:#6366f1;margin-bottom:12px;">Message</div>
          <div style="font-size:15px;line-height:1.7;color:#cbd5e1;background-color:#0a0a0c;border:1px solid #1e1e24;border-radius:10px;padding:18px 20px;">${safeMessage}</div>
        </td></tr>
        <tr><td style="padding-top:28px;" align="center">
          <a href="mailto:${safeEmail}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:10px;letter-spacing:0.2px;">Reply to ${firstName}</a>
        </td></tr>`,
      `${contactFooter(brand)}. The sender confirmed this address with a one-time code.`,
    ),
  };
}
