import { describe, expect, test } from 'bun:test';
import {
  displayPrefix,
  extractApiKey,
  generateApiKey,
  hashApiKey,
  parseKeyPrefix,
} from '@/features/api-keys/crypto';
import { apiKeyState } from '@/features/api-keys/state';

const PEPPER = 'p'.repeat(48);

describe('generateApiKey', () => {
  test('produces a key in the documented format', () => {
    expect(generateApiKey(PEPPER).key).toMatch(/^vnt_[a-f0-9]{12}_[A-Za-z0-9_-]{43}$/);
  });

  test('never repeats', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateApiKey(PEPPER).key));
    expect(keys.size).toBe(200);
  });

  test('the prefix cannot reveal the secret', () => {
    const { key, prefix } = generateApiKey(PEPPER);
    expect(prefix).toBe(key.split('_')[1] ?? '');
    expect(key.split('_')[2]).not.toContain(prefix);
  });

  test('the stored hash is not the key', () => {
    const { key, hash } = generateApiKey(PEPPER);
    expect(hash).not.toContain(key);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('hashApiKey', () => {
  test('is deterministic for one pepper', () => {
    expect(hashApiKey('key', PEPPER)).toBe(hashApiKey('key', PEPPER));
  });

  test('a different pepper gives a different hash', () => {
    expect(hashApiKey('key', PEPPER)).not.toBe(hashApiKey('key', 'q'.repeat(48)));
  });
});

describe('parseKeyPrefix', () => {
  test('returns only the public part of a well-formed key', () => {
    const { key, prefix } = generateApiKey(PEPPER);
    expect(parseKeyPrefix(key)).toBe(prefix);
  });

  test.each([
    '',
    'not-a-key',
    'vnt_short_abc',
    'sk_123456789012_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    `vnt_123456789012_${'A'.repeat(44)}`,
  ])('rejects %p', (value) => {
    expect(parseKeyPrefix(value)).toBeNull();
  });

  test('displays with the namespace', () => {
    expect(displayPrefix('abc123')).toBe('vnt_abc123');
  });
});

describe('extractApiKey', () => {
  test('reads a bearer token', () => {
    expect(extractApiKey(new Headers({ authorization: 'Bearer abc' }))).toBe('abc');
  });

  test('reads x-api-key', () => {
    expect(extractApiKey(new Headers({ 'x-api-key': 'abc' }))).toBe('abc');
  });

  test('rejects other authorization schemes', () => {
    expect(extractApiKey(new Headers({ authorization: 'Basic abc' }))).toBeNull();
  });

  test('returns null when there is no credential', () => {
    expect(extractApiKey(new Headers())).toBeNull();
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
