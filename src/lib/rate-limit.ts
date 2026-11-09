import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { rateLimits } from '@/db/schema';
import { logger } from './logger';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();
const MEMORY_MAX_KEYS = 5000;

export function consumeMemoryRateLimit({ key, limit, windowMs }: RateLimitInput): RateLimitResult {
  const now = Date.now();
  if (memory.size > MEMORY_MAX_KEYS) {
    for (const [entryKey, entry] of memory) if (entry.resetAt <= now) memory.delete(entryKey);
  }
  const existing = memory.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? { count: existing.count + 1, resetAt: existing.resetAt }
      : { count: 1, resetAt: now + windowMs };
  memory.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: new Date(bucket.resetAt),
  };
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const { key, limit, windowMs } = input;
  const interval = sql`now() + (${windowMs} * interval '1 millisecond')`;

  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt: sql`${interval}` })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
          resetAt: sql`case when ${rateLimits.resetAt} <= now() then ${interval} else ${rateLimits.resetAt} end`,
        },
      })
      .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

    if (!row) throw new Error('rate limit upsert returned no row');
    return {
      allowed: row.count <= limit,
      limit,
      remaining: Math.max(0, limit - row.count),
      resetAt: row.resetAt,
    };
  } catch (error) {
    logger.warn('rate limit falling back to memory', { error });
    return consumeMemoryRateLimit(input);
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  memory.delete(key);
  try {
    await db.delete(rateLimits).where(eq(rateLimits.key, key));
  } catch (error) {
    logger.warn('rate limit reset failed', { error });
  }
}

export async function claimInterval(name: string, intervalMs: number): Promise<boolean> {
  const result = await consumeRateLimit({
    key: `interval:${name}`,
    limit: 1,
    windowMs: intervalMs,
  });
  return result.allowed;
}
