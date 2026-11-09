import 'server-only';
import { runRetention } from '@/features/jobs/retention';
import { deliverNotification, markNotificationFailed } from '@/features/notifications/service';
import { runSecurityScan } from '@/features/security/detection';
import { logger } from '@/lib/logger';
import { claimInterval } from '@/lib/rate-limit';
import { createTrailingThrottle } from '@/lib/throttle';
import { JOB_NOTIFICATION_DELIVER, type JobHandler, processJobs } from './queue';

const SCAN_INTERVAL_MS = 60_000;
const RETENTION_INTERVAL_MS = 6 * 3_600_000;
const KICK_SPACING_MS = 3_000;

const throttleKicks = createTrailingThrottle(KICK_SPACING_MS);

const HANDLERS: Record<string, JobHandler> = {
  [JOB_NOTIFICATION_DELIVER]: {
    run: async ({ notificationId }) => deliverNotification(String(notificationId)),
    onExhausted: async ({ notificationId }, error) =>
      markNotificationFailed(String(notificationId), error),
  },
};

async function runPeriodicTasks(): Promise<void> {
  if (await claimInterval('security.scan', SCAN_INTERVAL_MS)) await runSecurityScan();
  if (await claimInterval('maintenance.retention', RETENTION_INTERVAL_MS)) await runRetention();
}

export async function runBackgroundTick(options?: { budgetMs?: number }) {
  await runPeriodicTasks();
  return processJobs(HANDLERS, options);
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
