import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkEmailDomain,
  createToken,
  generateCode,
  isWellFormedEmail,
  normalizeEmail,
  verificationMail,
} from '@/features/contact/service';
import { getEmailBrand } from '@/features/profile/brand';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp, ipBucket } from '@/lib/request-meta';

export const runtime = 'nodejs';

const WINDOW_MS = 10 * 60_000;

const Body = z.object({
  email: z.string(),
  website: z.string().optional(),
});

const DOMAIN_ERRORS = {
  disposable: {
    error: 'Disposable email addresses aren’t accepted. Please use your real address.',
    status: 400,
  },
  'no-mail': {
    error: 'That email domain can’t receive mail. Please check the address.',
    status: 400,
  },
  unknown: { error: 'Couldn’t check that email address right now. Please try again.', status: 503 },
} as const;

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isWellFormedEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ token: createToken(email, generateCode()) });
  }

  const clientIp = getClientIp(request.headers);
  const ip = clientIp ? ipBucket(clientIp) : 'unknown';
  const [byIp, byEmail] = await Promise.all([
    consumeRateLimit({ key: `contact:verify:ip:${ip}`, limit: 5, windowMs: WINDOW_MS }),
    consumeRateLimit({ key: `contact:verify:email:${email}`, limit: 3, windowMs: WINDOW_MS }),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return NextResponse.json(
      { error: 'Too many codes requested. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  const domain = await checkEmailDomain(email);
  if (domain !== 'ok') {
    const { error, status } = DOMAIN_ERRORS[domain];
    return NextResponse.json({ error }, { status });
  }

  const code = generateCode();
  try {
    await sendEmail({ to: email, ...verificationMail(code, await getEmailBrand()) });
  } catch (error) {
    logger.error('verification email failed', { error });
    return NextResponse.json(
      { error: 'Couldn’t send the verification code. Please check the address and try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ token: createToken(email, code) });
}
