import type { RateLimitResult } from '@vantedev/groundwork/rate-limit';

/**
 * groundwork sends the standard `RateLimit` and `RateLimit-Policy` headers. Clients of this API
 * also get the `X-RateLimit-*` headers it always sent, from the check `verify()` returns: the
 * per-key limit, or on a 429 the check that denied the request. `Cache-Control` is left to the
 * route.
 */
export function withLegacyRateLimitHeaders(
  headers: Readonly<Record<string, string>>,
  check: RateLimitResult | null | undefined,
): Record<string, string> {
  const { 'Cache-Control': _cacheControl, ...rest } = headers;
  const out: Record<string, string> = { ...rest };
  if (check) {
    out['X-RateLimit-Limit'] = String(check.limit);
    out['X-RateLimit-Remaining'] = String(check.remaining);
    out['X-RateLimit-Reset'] = String(Math.ceil(check.resetAt.getTime() / 1000));
  }
  return out;
}
