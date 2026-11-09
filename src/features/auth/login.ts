'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { authAttempts } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import { kickBackgroundWork } from '@/features/jobs/scheduler';
import { inspectAuthFailure } from '@/features/security/detection';
import { getIpRuleAction } from '@/features/security/service';
import { adminBasePath, getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getRequestMeta, ipBucket, type RequestMeta } from '@/lib/request-meta';
import { getAuth } from './auth';
import { requireAdminAction } from './session';

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

const LOGIN_WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_ACCOUNT = 30;
const GENERIC_ERROR = 'Those credentials are not valid.';

export interface LoginState {
  error: string | null;
  email: string;
  step: 'credentials' | 'two-factor';
}

async function logAttempt(
  identifier: string,
  success: boolean,
  reason: string | null,
  meta: RequestMeta,
): Promise<void> {
  try {
    await db.insert(authAttempts).values({
      identifier: identifier.slice(0, 254),
      success,
      reason,
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    logger.error('failed to record sign-in attempt', { error });
  }
}

function failure(identifier: string, reason: string, meta: RequestMeta): LoginState {
  after(async () => {
    await logAttempt(identifier, false, reason, meta);
    await inspectAuthFailure(meta);
    await kickBackgroundWork();
  });
  return { error: GENERIC_ERROR, email: identifier, step: 'credentials' };
}

const TWO_FACTOR_ERROR = 'That code is not valid.';
const MAX_CODE_ATTEMPTS_PER_IP = 10;
const TOTP_FORMAT = /^\d{6}$/;

function codeFailure(reason: string, meta: RequestMeta): LoginState {
  const identifier = getEnv().ADMIN_EMAIL?.toLowerCase() ?? 'unknown';
  after(async () => {
    await logAttempt(identifier, false, reason, meta);
    await inspectAuthFailure(meta);
    await kickBackgroundWork();
  });
  return { error: TWO_FACTOR_ERROR, email: '', step: 'two-factor' };
}

function completeSignIn(base: string, meta: RequestMeta, method: string): never {
  const identifier = getEnv().ADMIN_EMAIL?.toLowerCase() ?? 'unknown';
  after(async () => {
    await logAttempt(identifier, true, null, meta);
    await recordAudit({
      actor: identifier,
      action: 'auth.login',
      entityType: 'session',
      summary: `Signed in to the dashboard (${method})`,
      ip: meta.ip,
    });
  });
  redirect(base);
}

async function verifySecondFactor(base: string, formData: FormData): Promise<LoginState> {
  const requestHeaders = await headers();
  const meta = getRequestMeta(requestHeaders);
  if ((await getIpRuleAction(meta.ip)) === 'block') return codeFailure('ip_blocked', meta);

  const limit = await consumeRateLimit({
    key: `login:2fa:ip:${meta.ip ? ipBucket(meta.ip) : 'unknown'}`,
    limit: MAX_CODE_ATTEMPTS_PER_IP,
    windowMs: LOGIN_WINDOW_MS,
  });
  if (!limit.allowed) {
    codeFailure('rate_limited', meta);
    return {
      error: 'Too many attempts. Try again in a few minutes.',
      email: '',
      step: 'two-factor',
    };
  }

  const code = String(formData.get('code') ?? '')
    .trim()
    .slice(0, 32);
  if (!code) return codeFailure('malformed', meta);

  const isTotp = TOTP_FORMAT.test(code);
  try {
    if (isTotp) {
      await getAuth().api.verifyTOTP({ body: { code }, headers: requestHeaders });
    } else {
      await getAuth().api.verifyBackupCode({ body: { code }, headers: requestHeaders });
    }
  } catch (error) {
    if (error instanceof APIError) {
      if (error.body?.code === 'INVALID_TWO_FACTOR_COOKIE') {
        return {
          error: 'Your sign-in expired. Please start again.',
          email: '',
          step: 'credentials',
        };
      }
      return codeFailure('invalid_2fa_code', meta);
    }
    logger.error('two-factor verification failed unexpectedly', { error });
    return { error: 'Sign-in is unavailable right now.', email: '', step: 'two-factor' };
  }

  completeSignIn(base, meta, isTotp ? 'authenticator app' : 'backup code');
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const base = adminBasePath();
  if (!base) return { error: GENERIC_ERROR, email: '', step: 'credentials' };
  if (formData.get('step') === 'two-factor') return verifySecondFactor(base, formData);

  const requestHeaders = await headers();
  const meta = getRequestMeta(requestHeaders);
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  const identifier = (parsed.data?.email ?? String(formData.get('email') ?? '')).toLowerCase();
  if (!parsed.success) return failure(identifier || 'unknown', 'malformed', meta);
  if ((await getIpRuleAction(meta.ip)) === 'block') return failure(identifier, 'ip_blocked', meta);

  const [byIp, byAccount] = await Promise.all([
    consumeRateLimit({
      key: `login:ip:${meta.ip ? ipBucket(meta.ip) : 'unknown'}`,
      limit: MAX_ATTEMPTS_PER_IP,
      windowMs: LOGIN_WINDOW_MS,
    }),
    consumeRateLimit({
      key: `login:account:${identifier}`,
      limit: MAX_ATTEMPTS_PER_ACCOUNT,
      windowMs: LOGIN_WINDOW_MS,
    }),
  ]);
  if (!byIp.allowed || !byAccount.allowed) {
    failure(identifier, 'rate_limited', meta);
    return {
      error: 'Too many attempts. Try again in a few minutes.',
      email: identifier,
      step: 'credentials',
    };
  }

  const adminEmail = getEnv().ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail || identifier !== adminEmail) {
    return failure(identifier, 'unknown_account', meta);
  }

  try {
    const result = await getAuth().api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password, rememberMe: true },
      headers: requestHeaders,
    });
    if ('twoFactorRedirect' in result && result.twoFactorRedirect) {
      return { error: null, email: identifier, step: 'two-factor' };
    }
  } catch (error) {
    if (error instanceof APIError) return failure(identifier, 'invalid_password', meta);
    logger.error('sign-in failed unexpectedly', { error });
    return { error: 'Sign-in is unavailable right now.', email: identifier, step: 'credentials' };
  }

  completeSignIn(base, meta, 'password');
}

export async function logoutAction(): Promise<void> {
  const base = adminBasePath();
  try {
    const admin = await requireAdminAction();
    await getAuth().api.signOut({ headers: await headers() });
    await recordAudit({
      actor: admin.email,
      action: 'auth.logout',
      entityType: 'session',
      summary: 'Signed out of the dashboard',
    });
  } catch (error) {
    logger.warn('sign-out failed', { error });
  }
  redirect(base ? `${base}/login` : '/');
}
