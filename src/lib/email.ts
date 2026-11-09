import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { getEnv, siteUrl } from './env';

export interface EmailBrand {
  siteName: string;
  ownerName: string;
  url: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  from?: string;
}

export interface EmailResult {
  provider: 'resend' | 'smtp';
  messageId: string | null;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('No email provider is configured');
    this.name = 'EmailNotConfiguredError';
  }
}

export type EmailProvider = 'resend' | 'smtp' | null;

export function activeEmailProvider(): EmailProvider {
  const env = getEnv();
  if (env.RESEND_API_KEY) return 'resend';
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
  return null;
}

function defaultFrom(): string {
  const env = getEnv();
  return env.EMAIL_FROM ?? env.SMTP_USER ?? `noreply@${new URL(siteUrl()).hostname}`;
}

function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

async function sendWithResend(message: EmailMessage, apiKey: string): Promise<EmailResult> {
  const { data, error } = await new Resend(apiKey).emails.send({
    from: headerSafe(message.from ?? defaultFrom()),
    to: message.to,
    subject: headerSafe(message.subject),
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
  });
  if (error) throw new Error(`Resend rejected the message: ${error.message}`);
  return { provider: 'resend', messageId: data?.id ?? null };
}

async function sendWithSmtp(message: EmailMessage): Promise<EmailResult> {
  const env = getEnv();
  const info = await nodemailer
    .createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? 587),
      secure: env.SMTP_SECURE === 'true',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
    .sendMail({
      from: headerSafe(message.from ?? defaultFrom()),
      to: message.to,
      subject: headerSafe(message.subject),
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
  return { provider: 'smtp', messageId: info.messageId ?? null };
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const provider = activeEmailProvider();
  if (provider === 'resend') return sendWithResend(message, getEnv().RESEND_API_KEY ?? '');
  if (provider === 'smtp') return sendWithSmtp(message);
  throw new EmailNotConfiguredError();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailLayout(content: string, footer: string, accent = '#6366f1'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">
        <tr><td style="background-color:#111113;border:1px solid #1e1e24;border-radius:16px;overflow:hidden;">
          <div style="height:3px;background-color:${accent};"></div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 28px 28px;">
            ${content}
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:28px;">
          <p style="font-size:12px;color:#6b6b78;margin:0;line-height:1.6;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
