import 'server-only';
import { and, desc, eq, gte, ilike, lte, or, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, apiRequests, securityEvents } from '@/db/schema';
import { type DateRange, zeroFill } from '@/lib/date-range';

function inRange(range: DateRange) {
  return and(gte(apiRequests.createdAt, range.from), lte(apiRequests.createdAt, range.to));
}

function bucketFormat(range: DateRange) {
  return sql.raw(
    `'${range.bucket === 'hour' ? 'YYYY-MM-DD"T"HH24:00:00"Z"' : 'YYYY-MM-DD"T"00:00:00"Z"'}'`,
  );
}

export async function getApiSummary(range: DateRange) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      successful: sql<number>`count(*) filter (where ${apiRequests.outcome} = 'success')::int`,
      failed: sql<number>`count(*) filter (where ${apiRequests.outcome} <> 'success')::int`,
      serverErrors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 500)::int`,
      rateLimited: sql<number>`count(*) filter (where ${apiRequests.outcome} = 'rate_limited')::int`,
      unauthorized: sql<number>`count(*) filter (where ${apiRequests.outcome} = 'unauthorized')::int`,
      avgDuration: sql<number>`coalesce(avg(${apiRequests.durationMs}), 0)::float`,
      p95Duration: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${apiRequests.durationMs}), 0)::float`,
    })
    .from(apiRequests)
    .where(inRange(range));
  return (
    row ?? {
      total: 0,
      successful: 0,
      failed: 0,
      serverErrors: 0,
      rateLimited: 0,
      unauthorized: 0,
      avgDuration: 0,
      p95Duration: 0,
    }
  );
}

export async function getRequestTrend(range: DateRange) {
  const bucket = sql<string>`to_char(${apiRequests.createdAt} at time zone 'UTC', ${bucketFormat(range)})`;
  const rows = await db
    .select({
      bucket,
      successful: sql<number>`count(*) filter (where ${apiRequests.outcome} = 'success')::int`,
      failed: sql<number>`count(*) filter (where ${apiRequests.outcome} <> 'success')::int`,
      avgDuration: sql<number>`coalesce(avg(${apiRequests.durationMs}), 0)::float`,
    })
    .from(apiRequests)
    .where(inRange(range))
    .groupBy(bucket)
    .orderBy(bucket);
  return zeroFill(rows, range, { successful: 0, failed: 0, avgDuration: 0 });
}

export async function getEndpointStats(range: DateRange, limit = 12) {
  return db
    .select({
      endpoint: apiRequests.endpoint,
      total: sql<number>`count(*)::int`,
      failed: sql<number>`count(*) filter (where ${apiRequests.outcome} <> 'success')::int`,
      avgDuration: sql<number>`coalesce(avg(${apiRequests.durationMs}), 0)::float`,
    })
    .from(apiRequests)
    .where(inRange(range))
    .groupBy(apiRequests.endpoint)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getKeyStats(range: DateRange, limit = 12) {
  return db
    .select({
      apiKeyId: apiRequests.apiKeyId,
      name: sql<string>`coalesce(${apiKeys.name}, 'Unauthenticated')`,
      keyPrefix: sql<string | null>`max(${apiRequests.keyPrefix})`,
      total: sql<number>`count(*)::int`,
      failed: sql<number>`count(*) filter (where ${apiRequests.outcome} <> 'success')::int`,
    })
    .from(apiRequests)
    .leftJoin(apiKeys, eq(apiKeys.id, apiRequests.apiKeyId))
    .where(inRange(range))
    .groupBy(apiRequests.apiKeyId, apiKeys.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getStatusDistribution(range: DateRange) {
  return db
    .select({
      statusCode: apiRequests.statusCode,
      total: sql<number>`count(*)::int`,
    })
    .from(apiRequests)
    .where(inRange(range))
    .groupBy(apiRequests.statusCode)
    .orderBy(apiRequests.statusCode);
}

export async function getApiCountries(range: DateRange, limit = 12) {
  return db
    .select({
      country: apiRequests.country,
      total: sql<number>`count(*)::int`,
    })
    .from(apiRequests)
    .where(inRange(range))
    .groupBy(apiRequests.country)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getSuspiciousTrend(range: DateRange) {
  const bucket = sql<string>`to_char(${securityEvents.firstSeenAt} at time zone 'UTC', ${bucketFormat(range)})`;
  const rows = await db
    .select({ bucket, events: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(
      and(gte(securityEvents.firstSeenAt, range.from), lte(securityEvents.firstSeenAt, range.to)),
    )
    .groupBy(bucket)
    .orderBy(bucket);
  return zeroFill(rows, range, { events: 0 });
}

export async function listApiRequests(filters: {
  range: DateRange;
  q?: string;
  outcome?: string;
  endpoint?: string;
  page: number;
  pageSize: number;
}) {
  const conditions: (SQL | undefined)[] = [inRange(filters.range)];
  if (filters.outcome) {
    conditions.push(
      eq(apiRequests.outcome, filters.outcome as typeof apiRequests.$inferSelect.outcome),
    );
  }
  if (filters.endpoint) conditions.push(eq(apiRequests.endpoint, filters.endpoint));
  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(apiRequests.path, term),
        ilike(apiRequests.ip, term),
        ilike(apiRequests.keyPrefix, term),
        ilike(apiRequests.errorCode, term),
      ),
    );
  }
  const where = and(...conditions);

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(apiRequests)
      .where(where)
      .orderBy(desc(apiRequests.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: sql<number>`count(*)::int` }).from(apiRequests).where(where),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}
