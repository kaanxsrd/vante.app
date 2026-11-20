import 'server-only';
import { and, inArray, lt, ne } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsSalts,
  apiRequests,
  authAttempts,
  jobs,
  notifications,
  pageViews,
  securityEvents,
} from '@/db/schema';
import { pruneAuditLogs } from '@/features/audit/service';
import { getSetting } from '@/features/settings/service';
import { gw } from '@/lib/groundwork';
import { logger } from '@/lib/logger';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export async function runRetention(): Promise<void> {
  const [retention, analytics] = await Promise.all([
    getSetting('retention'),
    getSetting('analytics'),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  await Promise.all([
    db.delete(apiRequests).where(lt(apiRequests.createdAt, daysAgo(retention.apiRequestDays))),
    db.delete(authAttempts).where(lt(authAttempts.createdAt, daysAgo(retention.apiRequestDays))),
    db.delete(pageViews).where(lt(pageViews.createdAt, daysAgo(analytics.retentionDays))),
    pruneAuditLogs(retention.auditLogDays),
    db
      .delete(notifications)
      .where(lt(notifications.createdAt, daysAgo(retention.notificationDays))),
    db
      .delete(securityEvents)
      .where(
        and(
          lt(securityEvents.lastSeenAt, daysAgo(retention.securityEventDays)),
          inArray(securityEvents.status, ['resolved', 'false_positive']),
        ),
      ),
    db
      .delete(jobs)
      .where(and(inArray(jobs.status, ['completed', 'failed']), lt(jobs.createdAt, daysAgo(14)))),
    gw().rateLimit.cleanup(),
    db.delete(analyticsSalts).where(ne(analyticsSalts.day, today)),
  ]);
  logger.info('retention pass complete');
}
