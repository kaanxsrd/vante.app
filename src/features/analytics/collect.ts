import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsSalts, pageViews } from '@/db/schema';
import { getSetting } from '@/features/settings/service';
import { siteUrl } from '@/lib/env';
import { getRequestMeta } from '@/lib/request-meta';
import { hasOptedOut, isBot, normalizeTrackedPath, parseDevice, parseReferrer } from './parse';

let saltCache: { day: string; salt: string } | undefined;

async function dailySalt(): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  if (saltCache?.day === day) return saltCache.salt;

  await db
    .insert(analyticsSalts)
    .values({ day, salt: randomBytes(32).toString('hex') })
    .onConflictDoNothing({ target: analyticsSalts.day });
  const [row] = await db.select().from(analyticsSalts).where(eq(analyticsSalts.day, day));
  if (!row) throw new Error('analytics salt unavailable');

  saltCache = { day, salt: row.salt };
  return row.salt;
}

function hashVisitor(salt: string, ip: string, userAgent: string): string {
  return createHash('sha256').update(`${salt}:${ip}:${userAgent}`).digest('hex').slice(0, 32);
}

export interface PageViewInput {
  path: string;
  referrer?: string | null;
}

export async function collectPageView(input: PageViewInput, headers: Headers): Promise<boolean> {
  if (hasOptedOut(headers)) return false;

  const meta = getRequestMeta(headers);
  if (isBot(meta.userAgent) || !meta.ip || !meta.userAgent) return false;

  const path = normalizeTrackedPath(input.path);
  if (!path) return false;
  if (!(await getSetting('analytics')).enabled) return false;

  const { referrerHost, source } = parseReferrer(input.referrer, new URL(siteUrl()).hostname);
  await db.insert(pageViews).values({
    path,
    referrerHost,
    source,
    country: meta.country,
    device: parseDevice(meta.userAgent),
    visitorHash: hashVisitor(await dailySalt(), meta.ip, meta.userAgent),
  });
  return true;
}
