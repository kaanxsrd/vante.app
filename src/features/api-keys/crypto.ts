import { createHmac } from 'node:crypto';

const KEY_NAMESPACE = 'vnt';

/**
 * How this app hashed API keys before groundwork: HMAC-SHA256 with the raw pepper, hex encoded.
 * groundwork verifies keys stored this way (as `legacyHash`) and rehashes each on first use.
 */
export function hashApiKey(key: string, pepper: string): string {
  return createHmac('sha256', pepper).update(key).digest('hex');
}

export function displayPrefix(prefix: string): string {
  return `${KEY_NAMESPACE}_${prefix}`;
}
