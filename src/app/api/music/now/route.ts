import { getCopy } from '@/features/copy/queries';
import { getLatestTrack } from '@/features/music/queries';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const username = (await getCopy())['music.username'];
    const track = username ? await getLatestTrack(username) : null;
    return Response.json(
      { track },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=15' } },
    );
  } catch (error) {
    logger.warn('music now playing failed', { error });
    return Response.json({ track: null });
  }
}
