import { z } from 'zod';
import type { MusicUser, RecentTrack, TopAlbum, TopArtist, TopTrack } from './types';

const IMAGE_HOST = /^lastfm[a-z0-9-]*\.(freetls\.fastly\.net|akamaized\.net)$/;
const PLACEHOLDER_IMAGE = '2a96cbd8b46e442fc41c2b86b821562f';

const imagesSchema = z.array(z.object({ '#text': z.string().catch('') })).catch([]);
const countSchema = z.coerce.number().int().min(0).catch(0);
const nameSchema = z
  .union([z.string(), z.object({ name: z.string() }), z.object({ '#text': z.string() })])
  .transform((value) => {
    if (typeof value === 'string') return value;
    return 'name' in value ? value.name : value['#text'];
  });

export function cleanImage(images: { '#text': string }[]): string | null {
  for (const image of [...images].reverse()) {
    const url = image['#text'];
    if (!url || url.includes(PLACEHOLDER_IMAGE) || !URL.canParse(url)) continue;
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && IMAGE_HOST.test(parsed.hostname)) {
      return url.replace(/\/i\/u\/[^/]+\//, '/i/u/300x300/');
    }
  }
  return null;
}

export function cleanLink(url: unknown): string | null {
  if (typeof url !== 'string' || !URL.canParse(url)) return null;
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && /(^|\.)last\.fm$/.test(parsed.hostname)
    ? parsed.href
    : null;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function parseList<Schema extends z.ZodType, Item>(
  value: unknown,
  schema: Schema,
  convert: (item: z.output<Schema>) => Item,
): Item[] {
  return asList(value).flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [convert(parsed.data)] : [];
  });
}

const userSchema = z.object({
  user: z.object({
    name: z.string().min(1),
    url: z.unknown(),
    playcount: countSchema,
    artist_count: countSchema,
    album_count: countSchema,
    track_count: countSchema,
    registered: z.object({ unixtime: z.coerce.number() }).optional().catch(undefined),
  }),
});

export function normalizeUser(body: unknown): MusicUser | null {
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return null;
  const { user } = parsed.data;
  return {
    name: user.name,
    url: cleanLink(user.url),
    plays: user.playcount,
    artists: user.artist_count,
    albums: user.album_count,
    tracks: user.track_count,
    since: user.registered?.unixtime ? user.registered.unixtime * 1000 : null,
  };
}

const recentSchema = z.object({
  name: z.string().min(1),
  artist: nameSchema,
  album: nameSchema.optional().catch(undefined),
  image: imagesSchema.optional(),
  url: z.unknown(),
  date: z.object({ uts: z.coerce.number() }).optional().catch(undefined),
  '@attr': z.object({ nowplaying: z.unknown() }).optional().catch(undefined),
});

const recentBodySchema = z.object({
  recenttracks: z.object({
    track: z.unknown(),
    '@attr': z.object({ total: countSchema }).optional().catch(undefined),
  }),
});

export function normalizeRecent(body: unknown): RecentTrack[] {
  const parsed = recentBodySchema.safeParse(body);
  if (!parsed.success) return [];
  return parseList(parsed.data.recenttracks.track, recentSchema, (track) => ({
    name: track.name,
    artist: track.artist,
    album: track.album ?? '',
    image: cleanImage(track.image ?? []),
    url: cleanLink(track.url),
    playedAt: track.date ? track.date.uts * 1000 : null,
    nowPlaying: track['@attr']?.nowplaying === 'true',
  }));
}

export function totalPlays(body: unknown): number {
  const parsed = recentBodySchema.safeParse(body);
  return parsed.success ? (parsed.data.recenttracks['@attr']?.total ?? 0) : 0;
}

const artistSchema = z.object({
  name: z.string().min(1),
  playcount: countSchema,
  url: z.unknown(),
  image: imagesSchema.optional(),
});

export function normalizeTopArtists(body: unknown): TopArtist[] {
  const list = z.object({ topartists: z.object({ artist: z.unknown() }) }).safeParse(body);
  if (!list.success) return [];
  return parseList(list.data.topartists.artist, artistSchema, (artist) => ({
    name: artist.name,
    plays: artist.playcount,
    url: cleanLink(artist.url),
    image: cleanImage(artist.image ?? []),
  }));
}

const creditedSchema = artistSchema.extend({ artist: nameSchema });

function toCredited(item: z.output<typeof creditedSchema>): TopAlbum {
  return {
    name: item.name,
    artist: item.artist,
    plays: item.playcount,
    url: cleanLink(item.url),
    image: cleanImage(item.image ?? []),
  };
}

export function normalizeTopAlbums(body: unknown): TopAlbum[] {
  const list = z.object({ topalbums: z.object({ album: z.unknown() }) }).safeParse(body);
  return list.success ? parseList(list.data.topalbums.album, creditedSchema, toCredited) : [];
}

export function normalizeTopTracks(body: unknown): TopTrack[] {
  const list = z.object({ toptracks: z.object({ track: z.unknown() }) }).safeParse(body);
  return list.success ? parseList(list.data.toptracks.track, creditedSchema, toCredited) : [];
}
