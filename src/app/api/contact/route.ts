import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkToken,
  claimToken,
  contactMail,
  LIMITS,
  normalizeEmail,
  releaseToken,
} from '@/features/contact/service';
import { getEmailBrand } from '@/features/profile/brand';
import { sendEmail } from '@/lib/email';
import { requireEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp, ipBucket } from '@/lib/request-meta';

export const runtime = 'nodejs';

const WINDOW_MS = 10 * 60_000;

const Body = z.object({
  name: z.string().trim().min(1).max(LIMITS.name),
  email: z.string().max(LIMITS.email),
  message: z.string().trim().min(1).max(LIMITS.message),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  token: z.string().max(1000),
  website: z.string().optional(),
});

const TOKEN_ERRORS = {
  invalid: { error: 'Please request a new verification code.', status: 400 },
  expired: { error: 'That code has expired. Please request a new one.', status: 400 },
  'wrong-code': {
    error: 'That code isn’t right. Please check your email and try again.',
    status: 400,
  },
} as const;

function validationMessage(field: PropertyKey | undefined): string {
  if (field === 'code') return 'Enter the 6-digit code from your email.';
  if (field === 'message') return `Please write a message (up to ${LIMITS.message} characters).`;
  if (field === 'name') return 'Please enter your name.';
  return 'Invalid request.';
}

function tooManyAttempts() {
  return NextResponse.json(
    { error: 'Too many attempts. Please try again in a few minutes.' },
    { status: 429 },
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = await consumeRateLimit({
    key: `contact:send:${ip ? ipBucket(ip) : 'unknown'}`,
    limit: 10,
    windowMs: WINDOW_MS,
  });
  if (!limit.allowed) return tooManyAttempts();

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const error = validationMessage(parsed.error.issues[0]?.path[0]);
    return NextResponse.json({ error }, { status: 400 });
  }

  const { name, message, code, token, website } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const byEmail = await consumeRateLimit({
    key: `contact:send:email:${email}`,
    limit: 10,
    windowMs: WINDOW_MS,
  });
  if (!byEmail.allowed) return tooManyAttempts();

  const result = website ? 'invalid' : checkToken(token, email, code);
  if (result !== 'ok') {
    const { error, status } = TOKEN_ERRORS[result];
    return NextResponse.json({ error }, { status });
  }

  if (!(await claimToken(token))) {
    return NextResponse.json({ error: 'This message was already sent.' }, { status: 409 });
  }

  try {
    await sendEmail({
      to: requireEnv('CONTACT_EMAIL'),
      replyTo: email,
      ...contactMail({ name, email, message }, await getEmailBrand()),
    });
  } catch (error) {
    await releaseToken(token);
    logger.error('contact message failed', { error });
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
