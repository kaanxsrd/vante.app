import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_SITE_URL: optionalString,
  DATABASE_URL: optionalString,
  ADMIN_PATH: optionalString,
  ADMIN_EMAIL: optionalString,
  BETTER_AUTH_SECRET: optionalString,
  API_KEY_PEPPER: optionalString,
  CRON_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  SECURITY_ALERT_EMAIL: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalString,
  SMTP_SECURE: optionalString,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  CONTACT_EMAIL: optionalString,
  CONTACT_TOKEN_SECRET: optionalString,
  LASTFM_API_KEY: optionalString,
  TRUSTED_IP_HEADER: optionalString,
  GEO_COUNTRY_HEADER: optionalString,
  LOG_LEVEL: optionalString,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}

export function requireEnv(name: keyof Env): string {
  const value = getEnv()[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function requireSecret(name: keyof Env, minLength = 32): string {
  const value = requireEnv(name);
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters`);
  }
  return value;
}

export function siteUrl(): string {
  return (getEnv().NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

const ADMIN_PATH_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function adminBasePath(): string | null {
  const value = getEnv().ADMIN_PATH?.replace(/^\/+|\/+$/g, '');
  if (!value || !ADMIN_PATH_PATTERN.test(value)) return null;
  return `/${value}`;
}
