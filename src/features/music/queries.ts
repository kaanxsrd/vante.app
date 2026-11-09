import 'server-only';
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';
import {
  fetchActivity,
  fetchRecent,
  fetchTop,
  fetchUser,
  LastfmError,
  withBorrowedArt,
} from './service';
import {
  MUSIC_PERIODS,
  type MusicOverview,
  type MusicTopByPeriod,
  type RecentTrack,
} from './types';

const LATEST_TRACK_LIMIT = 1;

const loadUser = unstable_cache(fetchUser, ['music-user'], { revalidate: 900 });
const loadTop = unstable_cache(fetchTop, ['music-top-v3'], { revalidate: 900 });
const loadActivity = unstable_cache(fetchActivity, ['music-activity-v2'], { revalidate: 3600 });
const loadRecent = unstable_cache(fetchRecent, ['music-recent'], { revalidate: 30 });
const loadLatest = unstable_cache(fetchRecent, ['music-latest'], { revalidate: 15 });

const EMPTY_TOP = Object.fromEntries(
  MUSIC_PERIODS.map((period) => [period, { artists: [], albums: [], tracks: [] }]),
) as unknown as MusicTopByPeriod;

async function orFallback<Value>(
  section: string,
  task: Promise<Value>,
  fallback: Value,
): Promise<Value> {
  try {
    return await task;
  } catch (error) {
    logger.warn('last.fm section unavailable', {
      section,
      code: error instanceof LastfmError ? error.code : null,
      reason: error instanceof LastfmError ? error.reason : (error as Error)?.name,
    });
    return fallback;
  }
}

export async function getMusicOverview(username: string): Promise<MusicOverview | null> {
  const user = await orFallback('user', loadUser(username), null);
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const [top, activity, recent] = await Promise.all([
    orFallback('top', loadTop(username), EMPTY_TOP),
    orFallback('activity', loadActivity(username, today), []),
    orFallback('recent', loadRecent(username), []),
  ]);

  return {
    user,
    top: withBorrowedArt(top, recent),
    activity,
    recent,
    generatedAt: Date.now(),
  };
}

export async function getLatestTrack(username: string): Promise<RecentTrack | null> {
  const tracks = await orFallback('latest', loadLatest(username, LATEST_TRACK_LIMIT), []);
  return tracks[0] ?? null;
}
