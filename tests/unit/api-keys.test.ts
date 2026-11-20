import { describe, expect, test } from 'bun:test';
import { displayPrefix, hashApiKey } from '@/features/api-keys/crypto';
import { apiKeyState } from '@/features/api-keys/state';
import { withLegacyRateLimitHeaders } from '@/features/api-platform/rate-limit-headers';

const PEPPER = 'p'.repeat(48);

describe('hashApiKey (keys from before groundwork)', () => {
  test('is deterministic for one pepper', () => {
    expect(hashApiKey('key', PEPPER)).toBe(hashApiKey('key', PEPPER));
  });

  test('a different pepper gives a different hash', () => {
    expect(hashApiKey('key', PEPPER)).not.toBe(hashApiKey('key', 'q'.repeat(48)));
  });

  test('is the hex HMAC stored before groundwork', () => {
    expect(hashApiKey('key', PEPPER)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('displayPrefix', () => {
  test('displays with the namespace', () => {
    expect(displayPrefix('abc123')).toBe('vnt_abc123');
  });
});

describe('withLegacyRateLimitHeaders', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');

  test('adds the X-RateLimit headers this API always sent', () => {
    const headers = withLegacyRateLimitHeaders(
      {
        'RateLimit-Policy': '"rate";q=60;w=60',
        RateLimit: '"rate";r=59;t=42',
      },
      now,
    );
    expect(headers).toEqual({
      'RateLimit-Policy': '"rate";q=60;w=60',
      RateLimit: '"rate";r=59;t=42',
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': '59',
      'X-RateLimit-Reset': String(now / 1000 + 42),
    });
  });

  test('keeps Retry-After on a 429 and leaves Cache-Control to the route', () => {
    const headers = withLegacyRateLimitHeaders(
      {
        'Cache-Control': 'no-store',
        'RateLimit-Policy': '"quota";q=1000;w=86400',
        RateLimit: '"quota";r=0;t=3600',
        'Retry-After': '3600',
      },
      now,
    );
    expect(headers['Retry-After']).toBe('3600');
    expect(headers['X-RateLimit-Limit']).toBe('1000');
    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['Cache-Control']).toBeUndefined();
  });

  test('adds nothing for a key without a limit', () => {
    expect(withLegacyRateLimitHeaders({}, now)).toEqual({});
  });
});

describe('apiKeyState', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  const past = new Date('2026-05-01T00:00:00Z');
  const future = new Date('2026-07-01T00:00:00Z');
  const base = { revokedAt: null, expiresAt: null, suspendedUntil: null };

  test('active by default', () => expect(apiKeyState(base, now)).toBe('active'));
  test('a past expiry is expired', () =>
    expect(apiKeyState({ ...base, expiresAt: past }, now)).toBe('expired'));
  test('a future expiry is active', () =>
    expect(apiKeyState({ ...base, expiresAt: future }, now)).toBe('active'));
  test('an active suspension is suspended', () =>
    expect(apiKeyState({ ...base, suspendedUntil: future }, now)).toBe('suspended'));
  test('a lapsed suspension is active', () =>
    expect(apiKeyState({ ...base, suspendedUntil: past }, now)).toBe('active'));
  test('revocation outranks everything', () =>
    expect(apiKeyState({ revokedAt: past, expiresAt: past, suspendedUntil: future }, now)).toBe(
      'revoked',
    ));
});
