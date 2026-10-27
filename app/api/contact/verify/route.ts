import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkEmailDomain,
  clientIp,
  createToken,
  createTransport,
  generateCode,
  isWellFormedEmail,
  normalizeEmail,
  rateLimit,
  verificationMail,
} from '@/lib/contact';

export const runtime = 'nodejs';

const WINDOW_MS = 1000 * 60 * 10;

const Body = z.object({
  email: z.string(),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().optional(),
});

/** Step 1: mail a one-time code to the address the visitor typed. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isWellFormedEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  // Look like it worked, but mail nothing: the token belongs to a code nobody will ever see.
  if (parsed.data.website) {
    return NextResponse.json({ token: createToken(email, generateCode()) });
  }

  const ip = clientIp(req.headers);
  if (
    !rateLimit(`verify:ip:${ip}`, 5, WINDOW_MS) ||
    !rateLimit(`verify:email:${email}`, 3, WINDOW_MS)
  ) {
    return NextResponse.json(
      { error: 'Too many codes requested. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  const domain = await checkEmailDomain(email);
  if (domain === 'disposable') {
    return NextResponse.json(
      { error: 'Disposable email addresses aren’t accepted. Please use your real address.' },
      { status: 400 },
    );
  }
  if (domain === 'no-mail') {
    return NextResponse.json(
      { error: 'That email domain can’t receive mail. Please check the address.' },
      { status: 400 },
    );
  }
  if (domain === 'unknown') {
    return NextResponse.json(
      { error: 'Couldn’t check that email address right now. Please try again.' },
      { status: 503 },
    );
  }

  const code = generateCode();
  try {
    await createTransport().sendMail({
      from: `vante.app <${process.env.SMTP_USER}>`,
      to: email,
      ...verificationMail(code),
    });
  } catch {
    return NextResponse.json(
      { error: 'Couldn’t send the verification code. Please check the address and try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ token: createToken(email, code) });
}
