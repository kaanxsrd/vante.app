import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkToken,
  clientIp,
  contactMail,
  createTransport,
  LIMITS,
  markTokenUsed,
  normalizeEmail,
  rateLimit,
} from '@/lib/contact';

export const runtime = 'nodejs';

const WINDOW_MS = 1000 * 60 * 10;

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
  used: { error: 'This message was already sent.', status: 409 },
} as const;

/** Step 2: send the message, but only with the code that was mailed to the sender's address. */
export async function POST(req: NextRequest) {
  // Counts every attempt, including wrong codes, so codes can't be guessed quickly.
  if (!rateLimit(`send:ip:${clientIp(req.headers)}`, 10, WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const error =
      field === 'code'
        ? 'Enter the 6-digit code from your email.'
        : field === 'message'
          ? `Please write a message (up to ${LIMITS.message} characters).`
          : field === 'name'
            ? 'Please enter your name.'
            : 'Invalid request.';
    return NextResponse.json({ error }, { status: 400 });
  }

  const { name, message, code, token, website } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const result = checkToken(token, email, code);
  if (website || result !== 'ok') {
    const { error, status } = website
      ? TOKEN_ERRORS.invalid
      : TOKEN_ERRORS[result as keyof typeof TOKEN_ERRORS];
    return NextResponse.json({ error }, { status });
  }

  try {
    await createTransport().sendMail({
      from: `Contact Form <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      replyTo: email,
      ...contactMail({ name, email, message }),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  markTokenUsed(token);
  return NextResponse.json({ success: true });
}
