import { gw } from './groundwork';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

interface RateLimitInput {
  /** What is limited, such as `login:ip:<address>`. Stored only as an HMAC. */
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Fixed windows counted by groundwork in Postgres, shared by every instance. If the database is
 * unreachable, groundwork counts in this process's memory until it's back, as this app did.
 * Callers pass the limit with each call, so each call defines its rule (that does no I/O). The
 * limit and window in the name keep different limits' counters apart; the key is the subject.
 */
function ruleFor(limit: number, windowMs: number) {
  return gw().rateLimit.rule({
    name: `vante:${limit}/${windowMs}ms`,
    limit,
    window: `${windowMs}ms`,
  });
}

export async function consumeRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitInput): Promise<RateLimitResult> {
  const result = await ruleFor(limit, windowMs).check(key);
  return {
    allowed: result.allowed,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}

/** Forgets `key`'s usage, so its next request starts a fresh window. */
export async function resetRateLimit({ key, limit, windowMs }: RateLimitInput): Promise<void> {
  await ruleFor(limit, windowMs).reset(key);
}
