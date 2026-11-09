import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import {
  cleanImage,
  cleanLink,
  normalizeRecent,
  normalizeTopAlbums,
  normalizeTopArtists,
  normalizeTopTracks,
  normalizeUser,
  totalPlays,
} from '@/features/music/normalize';
import { callLastfm, fetchActivity, LastfmError, withBorrowedArt } from '@/features/music/service';
import { largeArt, MUSIC_PERIODS, type MusicTopByPeriod } from '@/features/music/types';
import { resetEnvCache } from '@/lib/env';

const CDN = 'https://lastfm-img.freetls.fastly.net/i/u';
const STAR = '2a96cbd8b46e442fc41c2b86b821562f';
const KEY = 'secret_key_for_tests';

const images = (hash: string) => [
  { size: 'small', '#text': `${CDN}/34s/${hash}.jpg` },
  { size: 'extralarge', '#text': `${CDN}/300x300/${hash}.jpg` },
];

describe('cleanImage', () => {
  test('uses the largest image at the size the page shows', () => {
    expect(cleanImage(images('abc'))).toBe(`${CDN}/300x300/abc.jpg`);
    expect(largeArt(cleanImage(images('abc')))).toBe(`${CDN}/500x500/abc.jpg`);
  });

  test('drops the grey star Last.fm returns for missing art', () => {
    expect(cleanImage(images(STAR))).toBeNull();
  });

  test.each([
    'https://lastfm-img.freetls.fastly.net/i/u/174s/a.jpg',
    'https://lastfm.freetls.fastly.net/i/u/174s/a.jpg',
    'https://lastfm-img2.akamaized.net/i/u/174s/a.jpg',
  ])('accepts the Last.fm image host %s', (url) => {
    expect(cleanImage([{ '#text': url }])).toBe(url.replace('/174s/', '/300x300/'));
  });

  test.each([
    'https://evil.example/a.jpg',
    'https://notlastfm.freetls.fastly.net/i/u/174s/a.jpg',
    'https://lastfm-img.freetls.fastly.net.evil.example/i/u/174s/a.jpg',
    'http://lastfm-img.freetls.fastly.net/i/u/174s/a.jpg',
  ])('refuses %s', (url) => {
    expect(cleanImage([{ '#text': url }])).toBeNull();
  });

  test('ignores blanks and garbage', () => {
    expect(cleanImage([{ '#text': '' }, { '#text': 'not a url' }])).toBeNull();
  });
});

describe('cleanLink', () => {
  test('only allows Last.fm over https', () => {
    expect(cleanLink('https://www.last.fm/music/Cher')).toBe('https://www.last.fm/music/Cher');
    for (const bad of ['javascript:alert(1)', 'http://www.last.fm/x', 'https://notlast.fm/x', 7]) {
      expect(cleanLink(bad)).toBeNull();
    }
  });
});

describe('normalizeUser', () => {
  test('turns text counts into numbers', () => {
    expect(
      normalizeUser({
        user: {
          name: 'someone',
          url: 'https://www.last.fm/user/someone',
          playcount: '1200',
          artist_count: '30',
          album_count: '40',
          track_count: '50',
          registered: { unixtime: '1000', '#text': 1000 },
        },
      }),
    ).toEqual({
      name: 'someone',
      url: 'https://www.last.fm/user/someone',
      plays: 1200,
      artists: 30,
      albums: 40,
      tracks: 50,
      since: 1_000_000,
    });
  });

  test('a broken response is refused', () => {
    expect(normalizeUser({ nope: true })).toBeNull();
  });
});

describe('normalizeRecent', () => {
  const played = {
    name: 'Song',
    artist: { '#text': 'Band' },
    album: { '#text': 'Record' },
    image: images('abc'),
    url: 'https://www.last.fm/music/Band/_/Song',
    date: { uts: '1700000000' },
  };

  test('reads played and now-playing tracks', () => {
    const [first, second] = normalizeRecent({
      recenttracks: {
        track: [
          {
            ...played,
            date: undefined,
            '@attr': { nowplaying: 'true' },
          },
          played,
        ],
      },
    });
    expect(first?.nowPlaying).toBe(true);
    expect(first?.playedAt).toBeNull();
    expect(second).toMatchObject({
      name: 'Song',
      artist: 'Band',
      album: 'Record',
      nowPlaying: false,
      playedAt: 1_700_000_000_000,
    });
  });

  test('accepts a single track sent without a list', () => {
    expect(normalizeRecent({ recenttracks: { track: played } })).toHaveLength(1);
  });

  test('skips a malformed track and keeps the rest', () => {
    expect(normalizeRecent({ recenttracks: { track: [{ bad: 1 }, played] } })).toHaveLength(1);
  });

  test('reads the total for a date range', () => {
    expect(totalPlays({ recenttracks: { track: [], '@attr': { total: '37' } } })).toBe(37);
    expect(totalPlays({})).toBe(0);
  });
});

describe('top lists', () => {
  const credit = { url: 'https://www.last.fm/x', playcount: '9', image: images('abc') };

  test('artists, albums and tracks', () => {
    expect(
      normalizeTopArtists({ topartists: { artist: [{ ...credit, name: 'Band' }] } })[0],
    ).toMatchObject({ name: 'Band', plays: 9 });
    expect(
      normalizeTopAlbums({
        topalbums: { album: [{ ...credit, name: 'Record', artist: { name: 'Band' } }] },
      })[0],
    ).toMatchObject({ name: 'Record', artist: 'Band', plays: 9 });
    expect(
      normalizeTopTracks({
        toptracks: { track: [{ ...credit, name: 'Song', artist: { name: 'Band' } }] },
      })[0],
    ).toMatchObject({ name: 'Song', artist: 'Band' });
  });

  test('a missing list is empty rather than an error', () => {
    expect(normalizeTopArtists({})).toEqual([]);
    expect(normalizeTopAlbums({ topalbums: {} })).toEqual([]);
  });
});

describe('withBorrowedArt', () => {
  test('artists and tracks borrow a cover from the same artist', () => {
    const empty = { artists: [], albums: [], tracks: [] };
    const top = Object.fromEntries(
      MUSIC_PERIODS.map((p) => [p, empty]),
    ) as unknown as MusicTopByPeriod;
    const cover = `${CDN}/300x300/abc.jpg`;
    const item = { url: null, plays: 1, image: null };
    top['1month'] = {
      artists: [{ ...item, name: 'BAND' }],
      albums: [{ ...item, name: 'Record', artist: 'band', image: cover }],
      tracks: [{ ...item, name: 'Song', artist: 'Band' }],
    };
    const shownTop = withBorrowedArt(top, []);
    expect(shownTop['1month'].artists[0]?.image).toBe(cover);
    expect(shownTop['1month'].tracks[0]?.image).toBe(cover);
  });
});

describe('callLastfm', () => {
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    process.env.LASTFM_API_KEY = KEY;
    resetEnvCache();
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    delete process.env.LASTFM_API_KEY;
    resetEnvCache();
  });

  const respond = (status: number, body: unknown) => {
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      Response.json(body, { status })) as unknown as typeof fetch);
  };

  test('sends the method, key and parameters', async () => {
    respond(200, { ok: true });
    await callLastfm('user.getInfo', { user: 'a b' });
    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(url.hostname).toBe('ws.audioscrobbler.com');
    expect(url.searchParams.get('method')).toBe('user.getInfo');
    expect(url.searchParams.get('user')).toBe('a b');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('api_key')).toBe(KEY);
  });

  test('an API error carries its code and never the key', async () => {
    respond(404, { error: 6, message: 'User not found' });
    const error = await callLastfm('user.getInfo', { user: 'x' }).catch(
      (caught: LastfmError) => caught,
    );
    if (!(error instanceof LastfmError)) throw new Error('expected a LastfmError');
    expect(error.code).toBe(6);
    expect(`${error.message} ${error.stack}`).not.toContain(KEY);
  });

  test('a network failure does not reveal the address', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (url: string) => {
      throw new Error(`could not reach ${url}`);
    }) as unknown as typeof fetch);
    const error = await callLastfm('user.getInfo', { user: 'x' }).catch(
      (caught: LastfmError) => caught,
    );
    if (!(error instanceof LastfmError)) throw new Error('expected a LastfmError');
    expect(error.message).not.toContain(KEY);
  });

  test('a temporary failure is retried once', async () => {
    let calls = 0;
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () => {
      calls += 1;
      if (calls === 1) throw new Error('timed out');
      return Response.json({ ok: true });
    }) as unknown as typeof fetch);
    await expect(callLastfm('user.getInfo', { user: 'x' })).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  test('it gives up after the second failure', async () => {
    respond(500, {});
    await expect(callLastfm('user.getInfo', { user: 'x' })).rejects.toBeInstanceOf(LastfmError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('a permanent error is not retried', async () => {
    respond(404, { error: 6, message: 'User not found' });
    await expect(callLastfm('user.getInfo', { user: 'x' })).rejects.toBeInstanceOf(LastfmError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('no key means no request', async () => {
    delete process.env.LASTFM_API_KEY;
    resetEnvCache();
    respond(200, {});
    await expect(callLastfm('user.getInfo', { user: 'x' })).rejects.toBeInstanceOf(LastfmError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('activity covers 14 whole days ending today', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (raw: string) => {
      const from = new URL(raw).searchParams.get('from');
      return Response.json({ recenttracks: { track: [], '@attr': { total: from?.slice(-2) } } });
    }) as unknown as typeof fetch);
    const days = await fetchActivity('someone', '2026-11-09');
    expect(days).toHaveLength(14);
    expect(days[0]?.day).toBe('2026-10-27');
    expect(days[13]?.day).toBe('2026-11-09');
    const calls = fetchSpy.mock.calls.map(
      (call: unknown[]) => new URL(String(call[0])).searchParams,
    );
    for (const params of calls) {
      expect(Number(params.get('to')) - Number(params.get('from'))).toBe(86_399);
      expect(params.get('limit')).toBe('1');
    }
  });
});
