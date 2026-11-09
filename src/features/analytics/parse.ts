const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|go-http-client|axios|node-fetch/i;

export type Device = 'desktop' | 'mobile' | 'tablet' | 'other';
type TrafficSource = 'direct' | 'search' | 'social' | 'referral' | 'internal';

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function parseDevice(userAgent: string | null): Device {
  if (!userAgent) return 'other';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(userAgent)) return 'tablet';
  if (/mobi|iphone|ipod|android/i.test(userAgent)) return 'mobile';
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return 'desktop';
  return 'other';
}

const SEARCH_HOSTS = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave|kagi)\./i;
const SOCIAL_HOSTS =
  /(^|\.)(twitter|x|t|facebook|instagram|linkedin|reddit|youtube|tiktok|discord|threads|bsky|mastodon|news\.ycombinator)\.|^t\.co$|^lnkd\.in$/i;

export interface ReferrerInfo {
  referrerHost: string | null;
  source: TrafficSource;
}

export function parseReferrer(referrer: string | null | undefined, siteHost: string): ReferrerInfo {
  if (!referrer) return { referrerHost: null, source: 'direct' };

  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return { referrerHost: null, source: 'direct' };
  }
  if (!host) return { referrerHost: null, source: 'direct' };
  if (host === siteHost.replace(/^www\./, '')) return { referrerHost: null, source: 'internal' };

  if (SEARCH_HOSTS.test(host)) return { referrerHost: host, source: 'search' };
  if (SOCIAL_HOSTS.test(host)) return { referrerHost: host, source: 'social' };
  return { referrerHost: host, source: 'referral' };
}

const TRACKABLE_PATH = /^\/(?:(?:blog|projects)(?:\/[a-z0-9-]{1,120})?|contact|privacy)?$/;

export function normalizeTrackedPath(path: string): string | null {
  const pathname = path.split(/[?#]/)[0] ?? '';
  const trimmed = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return TRACKABLE_PATH.test(trimmed) ? trimmed : null;
}

export function hasOptedOut(headers: Headers): boolean {
  return headers.get('sec-gpc') === '1' || headers.get('dnt') === '1';
}
