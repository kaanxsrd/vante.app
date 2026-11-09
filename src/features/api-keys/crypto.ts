import { createHmac, randomBytes } from 'node:crypto';

const KEY_NAMESPACE = 'vnt';
const PREFIX_BYTES = 6;
const SECRET_BYTES = 32;
const KEY_PATTERN = /^vnt_([a-f0-9]{12})_([A-Za-z0-9_-]{43})$/;

export interface GeneratedKey {
  key: string;
  prefix: string;
  hash: string;
}

export function hashApiKey(key: string, pepper: string): string {
  return createHmac('sha256', pepper).update(key).digest('hex');
}

export function generateApiKey(pepper: string): GeneratedKey {
  const prefix = randomBytes(PREFIX_BYTES).toString('hex');
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  const key = `${KEY_NAMESPACE}_${prefix}_${secret}`;
  return { key, prefix, hash: hashApiKey(key, pepper) };
}

export function parseKeyPrefix(raw: string): string | null {
  return KEY_PATTERN.exec(raw)?.[1] ?? null;
}

export function displayPrefix(prefix: string): string {
  return `${KEY_NAMESPACE}_${prefix}`;
}

export function extractApiKey(headers: Headers): string | null {
  const authorization = headers.get('authorization');
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    return match?.[1] ?? null;
  }
  return headers.get('x-api-key')?.trim() || null;
}
