import type { RateLimitRule } from '@vantedev/groundwork/rate-limit';
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
 * Callers pass the limit with each call, so there is one groundwork rule per limit and window,
 * and the key is its subject.
 */
const rules = new Map<string, RateLimitRule>();

function ruleFor(limit: number, windowMs: number): RateLimitRule {
  const name = `vante:${limit}/${windowMs}ms`;
  let rule = rules.get(name);
  if (!rule) {
    rule = gw().rateLimit.rule({ name, limit, window: `${windowMs}ms` });
    rules.set(name, rule);
  }
  return rule;
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

/** True at most once per interval across every instance. */
export async function claimInterval(name: string, intervalMs: number): Promise<boolean> {
  const result = await consumeRateLimit({
    key: `interval:${name}`,
    limit: 1,
    windowMs: intervalMs,
  });
  return result.allowed;
}
