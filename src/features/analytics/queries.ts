import 'server-only';
import { and, desc, gte, like, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { pageViews, posts, projects } from '@/db/schema';
import { type DateRange, zeroFill } from '@/lib/date-range';

function inRange(range: DateRange) {
  return and(gte(pageViews.createdAt, range.from), lte(pageViews.createdAt, range.to));
}

function bucketSql(range: DateRange) {
  const format =
    range.bucket === 'hour' ? 'YYYY-MM-DD"T"HH24:00:00"Z"' : 'YYYY-MM-DD"T"00:00:00"Z"';
  return sql<string>`to_char(${pageViews.createdAt} at time zone 'UTC', ${sql.raw(`'${format}'`)})`;
}

export interface WebsiteSummary {
  views: number;
  visitors: number;
}

export async function getWebsiteSummary(range: DateRange): Promise<WebsiteSummary> {
  const [row] = await db
    .select({
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(inRange(range));
  return row ?? { views: 0, visitors: 0 };
}

export async function getUniqueVisitorsToday(): Promise<number> {
  const startOfDay = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const [row] = await db
    .select({ value: sql<number>`count(distinct ${pageViews.visitorHash})::int` })
    .from(pageViews)
    .where(gte(pageViews.createdAt, startOfDay));
  return row?.value ?? 0;
}

export async function getVisitorTrend(range: DateRange) {
  const bucket = bucketSql(range);
  const rows = await db
    .select({
      bucket,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(inRange(range))
    .groupBy(bucket)
    .orderBy(bucket);
  return zeroFill(rows, range, { views: 0, visitors: 0 });
}

async function groupCount(
  column:
    | typeof pageViews.path
    | typeof pageViews.country
    | typeof pageViews.device
    | typeof pageViews.source
    | typeof pageViews.referrerHost,
  range: DateRange,
  limit: number,
) {
  const rows = await db
    .select({
      name: column,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(inRange(range))
    .groupBy(column)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows;
}

export const getTopPages = (range: DateRange, limit = 10) =>
  groupCount(pageViews.path, range, limit);
export const getCountries = (range: DateRange, limit = 12) =>
  groupCount(pageViews.country, range, limit);
export const getDevices = (range: DateRange) => groupCount(pageViews.device, range, 4);
export async function getSources(range: DateRange) {
  const rows = await groupCount(pageViews.source, range, 5);
  return rows.filter((row) => row.name !== 'internal');
}
export const getReferrers = (range: DateRange, limit = 10) =>
  groupCount(pageViews.referrerHost, range, limit);

async function popularContent(prefix: '/blog/' | '/projects/', range: DateRange, limit: number) {
  return db
    .select({
      slug: sql<string>`substr(${pageViews.path}, ${prefix.length + 1})`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(inRange(range), like(pageViews.path, `${prefix}%`)))
    .groupBy(pageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getPopularPosts(range: DateRange, limit = 8) {
  const [rows, titles] = await Promise.all([
    popularContent('/blog/', range, limit),
    db.select({ slug: posts.slug, title: posts.title }).from(posts),
  ]);
  const titleBySlug = new Map(titles.map((row) => [row.slug, row.title]));
  return rows.map((row) => ({ ...row, title: titleBySlug.get(row.slug) ?? row.slug }));
}

export async function getPopularProjects(range: DateRange, limit = 8) {
  const [rows, titles] = await Promise.all([
    popularContent('/projects/', range, limit),
    db.select({ slug: projects.slug, title: projects.title }).from(projects),
  ]);
  const titleBySlug = new Map(titles.map((row) => [row.slug, row.title]));
  return rows.map((row) => ({ ...row, title: titleBySlug.get(row.slug) ?? row.slug }));
}
