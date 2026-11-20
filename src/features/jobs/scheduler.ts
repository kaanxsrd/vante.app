import 'server-only';
import { runRetention } from '@/features/jobs/retention';
import { runSecurityScan } from '@/features/security/detection';
import { jobs } from '@/lib/jobs';
import { logger } from '@/lib/logger';
import { createTrailingThrottle } from '@/lib/throttle';
// Defines notification.deliver: a process only runs the job types it has imported.
import '@/features/notifications/service';

const KICK_SPACING_MS = 3_000;

const throttleKicks = createTrailingThrottle(KICK_SPACING_MS);

jobs.schedule('security.scan', { every: '1m' }, () => runSecurityScan());
jobs.schedule('maintenance.retention', { every: '6h' }, () => runRetention());

/** Runs due jobs and schedules for up to `budgetMs`. Returns how many it started. */
export async function runBackgroundTick(options?: { budgetMs?: number }): Promise<number> {
  const summary = await jobs.runOnce({ budgetMs: options?.budgetMs ?? 8_000 });
  return summary.claimed;
}

export async function kickBackgroundWork(): Promise<void> {
  await throttleKicks('background', async () => {
    try {
      await runBackgroundTick({ budgetMs: 5000 });
    } catch (error) {
      logger.error('background work failed', { error });
    }
  });
}
