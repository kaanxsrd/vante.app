import 'server-only';
import { randomUUID } from 'node:crypto';
import type { VerifyFailureReason } from '@vantedev/groundwork/api-keys';
import type { NextRequest } from 'next/server';
import { after } from 'next/server';
import { ZodError } from 'zod';
import type { ApiScope } from '@/features/api-keys/scopes';
import { type KeyRecord, toKeyRecord } from '@/features/api-keys/service';
import {
  type ApiRequestRecord,
  outcomeForStatus,
  recordApiRequest,
} from '@/features/api-monitoring/record';
import { kickBackgroundWork } from '@/features/jobs/scheduler';
import { inspectApiRequest } from '@/features/security/detection';
import { getIpRuleAction } from '@/features/security/service';
import { gw } from '@/lib/groundwork';
import { logger } from '@/lib/logger';
import { consumeRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { getRequestMeta, ipBucket, type RequestMeta } from '@/lib/request-meta';
import { ApiError } from './http';
import { withLegacyRateLimitHeaders } from './rate-limit-headers';

const ANONYMOUS_LIMIT_PER_MINUTE = 120;
const MINUTE_MS = 60_000;

export interface ApiContext<Params> {
  request: NextRequest;
  params: Params;
  key: KeyRecord;
  requestId: string;
}

interface RouteOptions {
  endpoint: string;
  scope?: ApiScope;
  notFound?: boolean;
}

interface Trace {
  apiKeyId: string | null;
  keyPrefix: string | null;
  watched: boolean;
  quiet: boolean;
}

function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}

function tooManyRequests(result: RateLimitResult, code: string, message: string): ApiError {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
  return new ApiError(429, code, message, {
    ...rateLimitHeaders(result),
    'Retry-After': String(retryAfter),
  });
}

const BLOCK_MEMORY_MS = 10_000;
const MAX_REMEMBERED_DENIALS = 10_000;
const denials = new Map<string, { until: number; error: () => ApiError }>();

function rememberDenial(address: string, until: number, error: () => ApiError): void {
  if (denials.size > MAX_REMEMBERED_DENIALS) denials.clear();
  denials.set(address, { until, error });
}

async function guardNetwork(meta: RequestMeta, trace: Trace): Promise<void> {
  const address = meta.ip ? ipBucket(meta.ip) : null;
  const remembered = address ? denials.get(address) : undefined;
  if (remembered && remembered.until > Date.now()) {
    trace.quiet = true;
    throw remembered.error();
  }

  const rule = await getIpRuleAction(meta.ip);
  if (rule === 'block') {
    const error = () => new ApiError(403, 'ip_blocked', 'Access denied.');
    if (address) rememberDenial(address, Date.now() + BLOCK_MEMORY_MS, error);
    throw error();
  }
  if (rule === 'watch') trace.watched = true;

  if (address) {
    const limit = await consumeRateLimit({
      key: `api:ip:${address}`,
      limit: ANONYMOUS_LIMIT_PER_MINUTE,
      windowMs: MINUTE_MS,
    });
    if (!limit.allowed) {
      const error = () =>
        tooManyRequests(limit, 'ip_rate_limited', 'Too many requests from this address.');
      rememberDenial(address, limit.resetAt.getTime(), error);
      throw error();
    }
  }
}

/** This app's public error for each reason groundwork's verify can give. */
const VERIFY_ERRORS: Readonly<
  Record<VerifyFailureReason, { status: number; code: string; message: string }>
> = {
  missing: {
    status: 401,
    code: 'missing_api_key',
    message: 'Send your key in the Authorization header as a Bearer token.',
  },
  malformed: { status: 401, code: 'invalid_api_key', message: 'This API key is not valid.' },
  invalid: { status: 401, code: 'invalid_api_key', message: 'This API key is not valid.' },
  revoked: { status: 401, code: 'revoked_api_key', message: 'This API key has been revoked.' },
  expired: { status: 401, code: 'expired_api_key', message: 'This API key has expired.' },
  suspended: {
    status: 403,
    code: 'api_key_suspended',
    message: 'This API key is temporarily suspended.',
  },
  ip_denied: {
    status: 403,
    code: 'ip_not_allowed',
    message: 'This key cannot be used from this address.',
  },
  origin_denied: {
    status: 403,
    code: 'origin_not_allowed',
    message: 'This key cannot be used from this origin.',
  },
  forbidden_scope: { status: 403, code: 'insufficient_scope', message: '' },
  rate_limited: { status: 429, code: 'rate_limited', message: 'Rate limit exceeded for this key.' },
  quota_exceeded: {
    status: 429,
    code: 'daily_quota_exceeded',
    message: 'Daily quota exceeded for this key.',
  },
};

/**
 * Checks the key, its state, its IP and origin allowlists, the endpoint's scope, and the key's
 * per-minute limit and daily quota, all in groundwork's verify.
 */
async function authenticate(
  request: NextRequest,
  meta: RequestMeta,
  scope: ApiScope | undefined,
  trace: Trace,
): Promise<{ key: KeyRecord; headers: Record<string, string> }> {
  const result = await gw().apiKeys.verify(request, {
    scopes: scope ? [scope] : [],
    ip: meta.ip,
    origin: meta.origin,
  });
  if (!result.ok) {
    trace.apiKeyId = result.key?.id ?? null;
    trace.keyPrefix = result.prefix;
    const error = VERIFY_ERRORS[result.reason];
    const message =
      result.reason === 'forbidden_scope'
        ? `This key needs the ${scope} permission.`
        : error.message;
    throw new ApiError(
      error.status,
      error.code,
      message,
      error.status === 429
        ? withLegacyRateLimitHeaders(result.headers, result.quota ?? result.rateLimit)
        : undefined,
    );
  }
  trace.apiKeyId = result.key.id;
  trace.keyPrefix = result.key.prefix;
  return {
    key: toKeyRecord(result.key),
    headers: withLegacyRateLimitHeaders(result.headers, result.rateLimit),
  };
}

function errorResponse(rawError: unknown, requestId: string): Response {
  const error =
    rawError instanceof ZodError
      ? new ApiError(422, 'validation_error', 'The resulting record failed validation.')
      : rawError;
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status, headers: error.headers },
    );
  }
  logger.error('unhandled API error', { requestId, error });
  return Response.json(
    { error: { code: 'internal_error', message: 'Something went wrong.', requestId } },
    { status: 500 },
  );
}

function errorCodeOf(error: unknown): string {
  if (error instanceof ZodError) return 'validation_error';
  return error instanceof ApiError ? error.code : 'internal_error';
}

function scrubPath(pathname: string): string {
  return pathname.replace(/vnt_[a-f0-9]{12}_[A-Za-z0-9_-]+/g, 'vnt_[redacted]').slice(0, 500);
}

export function apiRoute<Params = Record<string, never>>(
  options: RouteOptions,
  handler: (context: ApiContext<Params>) => Promise<Response>,
) {
  return async (request: NextRequest, segment: { params: Promise<Params> }): Promise<Response> => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    const meta = getRequestMeta(request.headers);
    const trace: Trace = { apiKeyId: null, keyPrefix: null, watched: false, quiet: false };

    let response: Response;
    let errorCode: string | null = null;

    try {
      await guardNetwork(meta, trace);
      const { key, headers: limitHeaders } = await authenticate(
        request,
        meta,
        options.scope,
        trace,
      );
      if (options.notFound) throw new ApiError(404, 'not_found', 'No such endpoint.');

      response = await handler({ request, params: await segment.params, key, requestId });
      for (const [name, value] of Object.entries(limitHeaders)) response.headers.set(name, value);
    } catch (error) {
      errorCode = errorCodeOf(error);
      response = errorResponse(error, requestId);
    }

    response.headers.set('X-Request-Id', requestId);
    response.headers.set('Cache-Control', 'no-store');
    if (trace.quiet) return response;

    const record: ApiRequestRecord = {
      requestId,
      apiKeyId: trace.apiKeyId,
      keyPrefix: trace.keyPrefix,
      method: request.method,
      endpoint: options.endpoint,
      path: scrubPath(request.nextUrl.pathname),
      statusCode: response.status,
      outcome: outcomeForStatus(response.status),
      errorCode,
      durationMs: Math.round(performance.now() - startedAt),
      ...meta,
    };

    after(async () => {
      // groundwork's verify records the key's last use itself (at most once a minute).
      await recordApiRequest(record);
      await inspectApiRequest(record, { watched: trace.watched });
      await kickBackgroundWork();
    });

    return response;
  };
}
