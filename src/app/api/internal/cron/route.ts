import { timingSafeEqual } from 'node:crypto';
import { runBackgroundTick } from '@/features/jobs/scheduler';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function isAuthorized(header: string | null): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const processed = await runBackgroundTick({ budgetMs: 45_000 });
    return Response.json({ ok: true, processed });
  } catch (error) {
    logger.error('cron tick failed', { error });
    return Response.json({ ok: false }, { status: 500 });
  }
}
