/**
 * groundwork sends the standard `RateLimit` and `RateLimit-Policy` headers
 * (`"name";q=60;w=60` and `"name";r=59;t=42`). Clients of this API also get the `X-RateLimit-*`
 * headers it always sent, worked out from them. `Cache-Control` is left to the route.
 */
export function withLegacyRateLimitHeaders(
  headers: Readonly<Record<string, string>>,
  now = Date.now(),
): Record<string, string> {
  const { 'Cache-Control': _cacheControl, ...rest } = headers;
  const out: Record<string, string> = { ...rest };
  const quota = /;q=(\d+)/.exec(headers['RateLimit-Policy'] ?? '')?.[1];
  const state = /;r=(\d+);t=(\d+)/.exec(headers.RateLimit ?? '');
  if (quota && state?.[1] && state[2]) {
    out['X-RateLimit-Limit'] = quota;
    out['X-RateLimit-Remaining'] = state[1];
    out['X-RateLimit-Reset'] = String(Math.ceil(now / 1000) + Number(state[2]));
  }
  return out;
}
