import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor as twoFactorPlugin } from 'better-auth/plugins/two-factor';
import { db } from '@/db';
import { account, session, twoFactor, user, verification } from '@/db/schema';
import { requireSecret, siteUrl } from '@/lib/env';
import { ADMIN_COOKIE_PREFIX, PASSWORD_MIN_LENGTH } from './constants';

function createAuth() {
  return betterAuth({
    appName: 'Control center',
    baseURL: siteUrl(),
    secret: requireSecret('BETTER_AUTH_SECRET'),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification, twoFactor },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: false },
    advanced: {
      cookiePrefix: ADMIN_COOKIE_PREFIX,
      useSecureCookies: siteUrl().startsWith('https://'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
    },
    plugins: [
      twoFactorPlugin({
        accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 900 },
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
