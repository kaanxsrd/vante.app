import 'server-only';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, authAttempts, jobs, posts, projects, securityEvents } from '@/db/schema';
import {
  getUniqueVisitorsToday,
  getVisitorTrend,
  getWebsiteSummary,
} from '@/features/analytics/queries';
import { getApiSummary, getRequestTrend } from '@/features/api-monitoring/queries';
import type { DateRange } from '@/lib/date-range';
import { logger } from '@/lib/logger';

async function databaseLatency(): Promise<number | null> {
  const started = performance.now();
  try {
    await db.execute(sql`select 1`);
    return Math.round(performance.now() - started);
  } catch (error) {
    logger.error('database health check failed', { error });
    return null;
  }
}

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'idle';

function apiHealthStatus(total: number, serverErrors: number): HealthStatus {
  if (total === 0) return 'idle';
  const rate = serverErrors / total;
  if (rate >= 0.25) return 'down';
  if (rate >= 0.05) return 'degraded';
  return 'healthy';
}

export async function getOverview(range: DateRange) {
  const hourAgo = new Date(Date.now() - 3_600_000);
  const lastHour = { ...range, from: hourAgo, to: new Date() };

  const [
    website,
    uniqueToday,
    api,
    apiLastHour,
    visitorTrend,
    requestTrend,
    content,
    failedLogins,
    suspicious,
    recentEvents,
    recentActivity,
    queue,
    latency,
  ] = await Promise.all([
    getWebsiteSummary(range),
    getUniqueVisitorsToday(),
    getApiSummary(range),
    getApiSummary(lastHour),
    getVisitorTrend(range),
    getRequestTrend(range),
    Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          published: sql<number>`count(*) filter (where ${posts.status} = 'published')::int`,
        })
        .from(posts),
      db
        .select({
          total: sql<number>`count(*)::int`,
          published: sql<number>`count(*) filter (where ${projects.status} = 'published')::int`,
        })
        .from(projects),
    ]),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.success, false),
          gte(authAttempts.createdAt, range.from),
          lte(authAttempts.createdAt, range.to),
        ),
      ),
    db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${securityEvents.status} = 'open')::int`,
      })
      .from(securityEvents)
      .where(
        and(gte(securityEvents.lastSeenAt, range.from), lte(securityEvents.lastSeenAt, range.to)),
      ),
    db.select().from(securityEvents).orderBy(desc(securityEvents.lastSeenAt)).limit(6),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(jobs)
      .where(inArray(jobs.status, ['pending', 'running'])),
    databaseLatency(),
  ]);

  const [postCounts, projectCounts] = content;

  return {
    website,
    uniqueToday,
    api,
    visitorTrend,
    requestTrend,
    posts: postCounts[0] ?? { total: 0, published: 0 },
    projects: projectCounts[0] ?? { total: 0, published: 0 },
    failedLogins: failedLogins[0]?.value ?? 0,
    suspicious: suspicious[0] ?? { total: 0, open: 0 },
    recentEvents,
    recentActivity,
    health: {
      status: apiHealthStatus(apiLastHour.total, apiLastHour.serverErrors),
      requestsLastHour: apiLastHour.total,
      errorsLastHour: apiLastHour.serverErrors,
      avgDurationLastHour: apiLastHour.avgDuration,
      p95DurationLastHour: apiLastHour.p95Duration,
      databaseLatencyMs: latency,
      queueDepth: queue[0]?.value ?? 0,
    },
  };
}
