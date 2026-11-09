import { isIP } from 'node:net';
import { getEnv } from './env';

export interface RequestMeta {
  ip: string | null;
  country: string | null;
  origin: string | null;
  userAgent: string | null;
}

const COUNTRY_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry'];
const NON_COUNTRY_CODES = new Set(['XX', 'T1', 'ZZ']);

function clean(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeIp(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const value = candidate.trim().replace(/^::ffff:/i, '');
  return isIP(value) ? value : null;
}

export function getClientIp(headers: Headers): string | null {
  const trusted = getEnv().TRUSTED_IP_HEADER;
  if (trusted) return normalizeIp(headers.get(trusted)?.split(',')[0]);
  return (
    normalizeIp(headers.get('x-forwarded-for')?.split(',')[0]) ??
    normalizeIp(headers.get('x-real-ip'))
  );
}

export function getCountry(headers: Headers): string | null {
  const configured = getEnv().GEO_COUNTRY_HEADER;
  const names = configured ? [configured, ...COUNTRY_HEADERS] : COUNTRY_HEADERS;
  for (const name of names) {
    const code = headers.get(name)?.trim().toUpperCase();
    if (code && /^[A-Z]{2}$/.test(code) && !NON_COUNTRY_CODES.has(code)) return code;
  }
  return null;
}

export function ipBucket(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  const [head = '', tail = ''] = ip.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const zeros = ip.includes('::') ? 8 - headGroups.length - tailGroups.length : 0;
  const groups = [...headGroups, ...new Array<string>(Math.max(zeros, 0)).fill('0'), ...tailGroups];
  return `${groups
    .slice(0, 4)
    .map((group) => group.toLowerCase().padStart(4, '0'))
    .join(':')}::/64`;
}

export function getRequestMeta(headers: Headers): RequestMeta {
  return {
    ip: getClientIp(headers),
    country: getCountry(headers),
    origin: clean(headers.get('origin'), 255),
    userAgent: clean(headers.get('user-agent'), 500),
  };
}
