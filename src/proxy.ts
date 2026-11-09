import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_PREFIX, INTERNAL_ADMIN_ROUTE } from '@/features/auth/constants';

const ADMIN_PATH_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const isDev = process.env.NODE_ENV === 'development';
const devScript = isDev ? " 'unsafe-eval'" : '';
const devConnect = isDev ? ' ws:' : '';

const SHARED_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${devConnect}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const PUBLIC_CSP = [`script-src 'self' 'unsafe-inline'${devScript}`, ...SHARED_DIRECTIVES].join(
  '; ',
);

function adminCsp(nonce: string): string {
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devScript}`,
    ...SHARED_DIRECTIVES,
  ].join('; ');
}

function adminPrefix(): string | null {
  const value = process.env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, '');
  return value && ADMIN_PATH_PATTERN.test(value) ? `/${value}` : null;
}

function isWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function canonicalPath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).toLowerCase();
  } catch {
    return pathname.toLowerCase();
  }
}

function withBaseHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  return response;
}

function serveAdmin(request: NextRequest, prefix: string): NextResponse {
  const { pathname, search } = request.nextUrl;
  const rest = pathname.slice(prefix.length);

  if (rest !== '/login' && !getSessionCookie(request, { cookiePrefix: ADMIN_COOKIE_PREFIX })) {
    const login = new URL(`${prefix}/login`, request.url);
    return withBaseHeaders(NextResponse.redirect(login));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = adminCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const target = new URL(`${INTERNAL_ADMIN_ROUTE}${rest}${search}`, request.url);
  const response = NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return withBaseHeaders(response);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isWithin(canonicalPath(pathname), INTERNAL_ADMIN_ROUTE)) {
    return withBaseHeaders(NextResponse.rewrite(new URL('/404', request.url)));
  }

  const prefix = adminPrefix();
  if (prefix && isWithin(pathname, prefix)) return serveAdmin(request, prefix);

  const response = withBaseHeaders(NextResponse.next());
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/media/')) {
    response.headers.set('Content-Security-Policy', PUBLIC_CSP);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)'],
};
