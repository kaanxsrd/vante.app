import 'server-only';
import { createGroundwork } from '@vantedev/groundwork';
import { after } from 'next/server';
import { db } from '@/db';
import { gwApiKeys, gwRateLimits } from '@/db/schema';
import { hashApiKey } from '@/features/api-keys/crypto';
import { API_SCOPES } from '@/features/api-keys/scopes';
import { requireSecret } from './env';
import { logger } from './logger';

/**
 * Hands background writes (an API key's last use) to Next's `after` during a request, and lets
 * them run on their own elsewhere (the worker, tests).
 */
function inBackground(promise: Promise<unknown>): void {
  const settled = promise.catch((error) => logger.warn('background write failed', { error }));
  try {
    after(() => settled);
  } catch {
    // Outside a request: the promise is already running.
  }
}

function create() {
  // API_KEY_PEPPER already keys this app's API keys. groundwork derives its own keys from it, and
  // keeps verifying keys hashed the old way (HMAC with the raw pepper) until each is used once.
  const pepper = requireSecret('API_KEY_PEPPER');
  return createGroundwork({
    db,
    tables: { rateLimits: gwRateLimits, apiKeys: gwApiKeys },
    secret: pepper,
    logger,
    apiKeys: {
      namespace: 'vnt',
      scopes: API_SCOPES,
      legacyHash: (key) => hashApiKey(key, pepper),
      waitUntil: inBackground,
    },
  });
}

type Groundwork = ReturnType<typeof create>;

const store = globalThis as unknown as { __vanteGroundwork?: Groundwork };

/** The app's groundwork instance, created on first use like the database connection. */
export function gw(): Groundwork {
  store.__vanteGroundwork ??= create();
  return store.__vanteGroundwork;
}
