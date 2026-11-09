import 'server-only';
import { getEnv } from '@/lib/env';
import {
  normalizeRecent,
  normalizeTopAlbums,
  normalizeTopArtists,
  normalizeTopTracks,
  normalizeUser,
  totalPlays,
} from './normalize';
import {
  type DayActivity,
  MUSIC_PERIODS,
  type MusicPeriod,
  type MusicTop,
  type MusicTopByPeriod,
  type MusicUser,
  type RecentTrack,
} from './types';

const ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 400;
const TEMPORARY_ERROR_CODES = new Set([8, 11, 16]);
const MAX_PARALLEL_REQUESTS = 4;
const RECENT_LIMIT = 16;
const ALBUMS_FETCHED = 50;
const ARTISTS_SHOWN = 10;
const ALBUMS_SHOWN = 12;
const TRACKS_SHOWN = 10;
const ACTIVITY_DAYS = 14;
const SECONDS_PER_DAY = 86_400;

export class LastfmError extends Error {
  constructor(
    readonly code: number | null,
    readonly reason: string | null = null,
  ) {
    super(code === null ? 'Last.fm request failed' : `Last.fm returned error ${code}`);
    this.name = 'LastfmError';
  }
}

async function requestOnce(query: URLSearchParams): Promise<unknown> {
  const response = await fetch(`${ENDPOINT}?${query}`, {
    headers: { 'User-Agent': 'personal-website/1.0' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: unknown) => {
    throw new LastfmError(null, error instanceof Error ? error.name : 'unknown');
  });

  const body = (await response.json().catch(() => null)) as { error?: number } | null;
  if (!response.ok || !body || body.error) {
    throw new LastfmError(body?.error ?? null, `http ${response.status}`);
  }
  return body;
}

function isTemporary(error: unknown): boolean {
  if (!(error instanceof LastfmError)) return false;
  return error.code === null || TEMPORARY_ERROR_CODES.has(error.code);
}

export async function callLastfm(
  method: string,
  params: Record<string, string | number>,
): Promise<unknown> {
  const apiKey = getEnv().LASTFM_API_KEY;
  if (!apiKey) throw new LastfmError(null);

  const query = new URLSearchParams({ method, format: 'json', api_key: apiKey });
  for (const [key, value] of Object.entries(params)) query.set(key, String(value));

  try {
    return await requestOnce(query);
  } catch (error) {
    if (!isTemporary(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return requestOnce(query);
  }
}

async function mapLimited<Item, Result>(
  items: readonly Item[],
  work: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results = new Array<Result>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index] as Item);
    }
  };
  await Promise.all(Array.from({ length: MAX_PARALLEL_REQUESTS }, worker));
  return results;
}

export async function fetchUser(username: string): Promise<MusicUser> {
  const user = normalizeUser(await callLastfm('user.getInfo', { user: username }));
  if (!user) throw new LastfmError(null);
  return user;
}

export async function fetchRecent(
  username: string,
  limit: number = RECENT_LIMIT,
): Promise<RecentTrack[]> {
  const body = await callLastfm('user.getRecentTracks', { user: username, limit });
  return normalizeRecent(body).slice(0, limit);
}

async function fetchTopForPeriod(username: string, period: MusicPeriod): Promise<MusicTop> {
  const params = { user: username, period };
  const [artists, albums, tracks] = await Promise.all([
    callLastfm('user.getTopArtists', { ...params, limit: ARTISTS_SHOWN }),
    callLastfm('user.getTopAlbums', { ...params, limit: ALBUMS_FETCHED }),
    callLastfm('user.getTopTracks', { ...params, limit: TRACKS_SHOWN }),
  ]);
  return {
    artists: normalizeTopArtists(artists),
    albums: normalizeTopAlbums(albums),
    tracks: normalizeTopTracks(tracks),
  };
}

export async function fetchTop(username: string): Promise<MusicTopByPeriod> {
  const results = await mapLimited(MUSIC_PERIODS, (period) => fetchTopForPeriod(username, period));
  return Object.fromEntries(
    MUSIC_PERIODS.map((period, index) => [period, results[index]]),
  ) as MusicTopByPeriod;
}

export async function fetchActivity(username: string, today: string): Promise<DayActivity[]> {
  const todayStart = Date.parse(`${today}T00:00:00Z`) / 1000;
  const days = Array.from(
    { length: ACTIVITY_DAYS },
    (_, index) => todayStart - (ACTIVITY_DAYS - 1 - index) * SECONDS_PER_DAY,
  );
  return mapLimited(days, async (from) => {
    const body = await callLastfm('user.getRecentTracks', {
      user: username,
      from,
      to: from + SECONDS_PER_DAY - 1,
      limit: 1,
    });
    return {
      day: new Date(from * 1000).toISOString().slice(0, 10),
      plays: totalPlays(body),
    };
  });
}

export function withBorrowedArt(top: MusicTopByPeriod, recent: RecentTrack[]): MusicTopByPeriod {
  const artByArtist = new Map<string, string>();
  const remember = (artist: string, image: string | null) => {
    const key = artist.toLowerCase();
    if (image && !artByArtist.has(key)) artByArtist.set(key, image);
  };
  for (const period of MUSIC_PERIODS) {
    for (const album of top[period].albums) remember(album.artist, album.image);
  }
  for (const track of recent) remember(track.artist, track.image);

  return Object.fromEntries(
    MUSIC_PERIODS.map((period) => {
      const { artists, albums, tracks } = top[period];
      return [
        period,
        {
          artists: artists.map((artist) => ({
            ...artist,
            image: artist.image ?? artByArtist.get(artist.name.toLowerCase()) ?? null,
          })),
          albums: albums.slice(0, ALBUMS_SHOWN),
          tracks: tracks.map((track) => ({
            ...track,
            image: track.image ?? artByArtist.get(track.artist.toLowerCase()) ?? null,
          })),
        },
      ];
    }),
  ) as MusicTopByPeriod;
}
