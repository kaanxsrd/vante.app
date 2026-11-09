import type { NextRequest } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { collectPageView } from '@/features/analytics/collect';
import { logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getClientIp, ipBucket } from '@/lib/request-meta';

export const runtime = 'nodejs';

const bodySchema = z.object({
  path: z.string().min(1).max(300),
  referrer: z.string().max(2048).nullish(),
});

const NO_CONTENT = () => new Response(null, { status: 204 });

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return NO_CONTENT();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NO_CONTENT();

  const headers = new Headers(request.headers);
  after(async () => {
    try {
      const ip = getClientIp(headers);
      if (!ip) return;
      const limit = await consumeRateLimit({
        key: `collect:${ipBucket(ip)}`,
        limit: 120,
        windowMs: 60_000,
      });
      if (limit.allowed) await collectPageView(parsed.data, headers);
    } catch (error) {
      logger.warn('page view collection failed', { error });
    }
  });
  return NO_CONTENT();
}
