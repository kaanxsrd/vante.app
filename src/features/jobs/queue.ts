import 'server-only';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { logger } from '@/lib/logger';

type JobRow = typeof jobs.$inferSelect;

export interface JobHandler {
  run: (payload: Record<string, unknown>) => Promise<void>;
  onExhausted?: (payload: Record<string, unknown>, error: string) => Promise<void>;
}

export const JOB_NOTIFICATION_DELIVER = 'notification.deliver';

const BASE_BACKOFF_SECONDS = 30;
const STALE_LOCK_MINUTES = 5;

export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  options: { maxAttempts?: number } = {},
): Promise<void> {
  await db.insert(jobs).values({ type, payload, maxAttempts: options.maxAttempts ?? 5 });
}

export function backoffSeconds(attempts: number): number {
  return BASE_BACKOFF_SECONDS * 2 ** Math.max(0, attempts - 1);
}

async function claimNextJob(): Promise<JobRow | null> {
  const [job] = await db
    .update(jobs)
    .set({ status: 'running', lockedAt: new Date(), attempts: sql`${jobs.attempts} + 1` })
    .where(
      eq(
        jobs.id,
        sql`(select id from ${jobs} where ${jobs.status} = 'pending' and ${jobs.runAt} <= now() order by ${jobs.runAt} for update skip locked limit 1)`,
      ),
    )
    .returning();
  return job ?? null;
}

async function releaseStaleJobs(): Promise<void> {
  await db
    .update(jobs)
    .set({ status: 'pending', lockedAt: null })
    .where(
      and(
        eq(jobs.status, 'running'),
        lt(jobs.lockedAt, new Date(Date.now() - STALE_LOCK_MINUTES * 60_000)),
      ),
    );
}

export async function processJobs(
  handlers: Record<string, JobHandler>,
  { limit = 20, budgetMs = 8000 } = {},
): Promise<number> {
  await releaseStaleJobs();
  const deadline = Date.now() + budgetMs;
  let processed = 0;

  while (processed < limit && Date.now() < deadline) {
    const job = await claimNextJob();
    if (!job) break;
    processed += 1;

    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`No handler for job type ${job.type}`);
      await handler.run(job.payload);
      await db
        .update(jobs)
        .set({ status: 'completed', completedAt: new Date(), lastError: null, lockedAt: null })
        .where(eq(jobs.id, job.id));
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error';
      const exhausted = job.attempts >= job.maxAttempts;
      await db
        .update(jobs)
        .set({
          status: exhausted ? 'failed' : 'pending',
          lastError: message,
          lockedAt: null,
          runAt: new Date(Date.now() + backoffSeconds(job.attempts) * 1000),
        })
        .where(eq(jobs.id, job.id));
      logger.warn('job failed', { jobId: job.id, type: job.type, attempts: job.attempts, message });
      if (exhausted) await handler?.onExhausted?.(job.payload, message);
    }
  }
  return processed;
}
