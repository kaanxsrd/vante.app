import { describe, expect, test } from 'bun:test';
import {
  hasOptedOut,
  isBot,
  normalizeTrackedPath,
  parseDevice,
  parseReferrer,
} from '@/features/analytics/parse';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 13; SM-X700) Safari/537.36';

describe('isBot', () => {
  test.each([
    'Googlebot/2.1',
    'curl/8.0',
    'Mozilla/5.0 HeadlessChrome/120',
    'python-requests/2.31',
  ])('recognizes %s', (agent) => {
    expect(isBot(agent)).toBe(true);
  });

  test('treats a missing agent as a bot', () => expect(isBot(null)).toBe(true));
  test('lets browsers through', () => expect(isBot(CHROME)).toBe(false));
});

describe('parseDevice', () => {
  test('desktop', () => expect(parseDevice(CHROME)).toBe('desktop'));
  test('phone', () => expect(parseDevice(IPHONE)).toBe('mobile'));
  test('iPad', () => expect(parseDevice(IPAD)).toBe('tablet'));
  test('Android tablet', () => expect(parseDevice(ANDROID_TABLET)).toBe('tablet'));
  test('unknown', () => expect(parseDevice(null)).toBe('other'));
});

describe('parseReferrer', () => {
  const site = 'vante.app';

  test('no referrer is direct', () => {
    expect(parseReferrer(null, site)).toEqual({ referrerHost: null, source: 'direct' });
  });

  test('keeps only the host, dropping paths and queries', () => {
    const result = parseReferrer('https://example.com/private/path?token=secret', site);
    expect(result).toEqual({ referrerHost: 'example.com', source: 'referral' });
  });

  test('strips www', () => {
    expect(parseReferrer('https://www.example.com/', site).referrerHost).toBe('example.com');
  });

  test('classifies search engines', () => {
    expect(parseReferrer('https://www.google.com/', site).source).toBe('search');
  });

  test('classifies social networks', () => {
    expect(parseReferrer('https://www.reddit.com/r/x', site).source).toBe('social');
    expect(parseReferrer('https://t.co/abc', site).source).toBe('social');
  });

  test('marks navigation within the site as internal', () => {
    expect(parseReferrer('https://vante.app/blog', site).source).toBe('internal');
  });

  test('survives malformed values', () => {
    expect(parseReferrer('not a url', site).source).toBe('direct');
  });
});

describe('normalizeTrackedPath', () => {
  test.each([
    ['/', '/'],
    ['/blog', '/blog'],
    ['/blog/', '/blog'],
    ['/blog/my-post', '/blog/my-post'],
    ['/projects/x?utm=1#top', '/projects/x'],
    ['/contact', '/contact'],
    ['/privacy', '/privacy'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeTrackedPath(input)).toBe(expected);
  });

  test.each([
    '/my-private-panel',
    '/my-private-panel/login',
    '/console-internal',
    '/api/v1/posts',
    '/blog/a/b',
    '/blog/<script>',
    '/wp-admin',
  ])('refuses %s', (input) => {
    expect(normalizeTrackedPath(input)).toBeNull();
  });
});

describe('hasOptedOut', () => {
  test('Global Privacy Control', () => {
    expect(hasOptedOut(new Headers({ 'sec-gpc': '1' }))).toBe(true);
  });
  test('Do Not Track', () => expect(hasOptedOut(new Headers({ dnt: '1' }))).toBe(true));
  test('default is not opted out', () => expect(hasOptedOut(new Headers())).toBe(false));
});
