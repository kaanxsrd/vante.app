import 'server-only';
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { after } from 'next/server';
import { ZodError } from 'zod';
import { displayPrefix, extractApiKey, parseKeyPrefix } from '@/features/api-keys/crypto';
import type { ApiScope } from '@/features/api-keys/scopes';
import { findKeyBySecret, type KeyRecord, touchKeyUsage } from '@/features/api-keys/service';
import { apiKeyState } from '@/features/api-keys/state';
import {
  type ApiRequestRecord,
  outcomeForStatus,
  recordApiRequest,
} from '@/features/api-monitoring/record';
import { kickBackgroundWork } from '@/features/jobs/scheduler';
import { inspectApiRequest } from '@/features/security/detection';
import { getIpRuleAction } from '@/features/security/service';
import { logger } from '@/lib/logger';
import { consumeRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { getRequestMeta, ipBucket, type RequestMeta } from '@/lib/request-meta';
import { ApiError } from './http';

const ANONYMOUS_LIMIT_PER_MINUTE = 120;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

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

async function authenticate(request: NextRequest, trace: Trace): Promise<KeyRecord> {
  const raw = extractApiKey(request.headers);
  if (!raw) {
    throw new ApiError(
      401,
      'missing_api_key',
      'Send your key in the Authorization header as a Bearer token.',
    );
  }

  const presentedPrefix = parseKeyPrefix(raw);
  if (presentedPrefix) trace.keyPrefix = displayPrefix(presentedPrefix);

  const key = presentedPrefix ? await findKeyBySecret(raw) : null;
  if (!key) throw new ApiError(401, 'invalid_api_key', 'This API key is not valid.');

  trace.apiKeyId = key.id;
  trace.keyPrefix = displayPrefix(key.prefix);

  switch (apiKeyState(key)) {
    case 'revoked':
      throw new ApiError(401, 'revoked_api_key', 'This API key has been revoked.');
    case 'expired':
      throw new ApiError(401, 'expired_api_key', 'This API key has expired.');
    case 'suspended':
      throw new ApiError(403, 'api_key_suspended', 'This API key is temporarily suspended.');
    case 'active':
      return key;
  }
}

function enforcePolicy(key: KeyRecord, meta: RequestMeta, scope: ApiScope | undefined): void {
  if (key.allowedIps.length > 0 && (!meta.ip || !key.allowedIps.includes(meta.ip))) {
    throw new ApiError(403, 'ip_not_allowed', 'This key cannot be used from this address.');
  }
  if (
    key.allowedOrigins.length > 0 &&
    meta.origin &&
    !key.allowedOrigins.includes(meta.origin.toLowerCase())
  ) {
    throw new ApiError(403, 'origin_not_allowed', 'This key cannot be used from this origin.');
  }
  if (scope && !key.scopes.includes(scope)) {
    throw new ApiError(403, 'insufficient_scope', `This key needs the ${scope} permission.`);
  }
}

async function enforceLimits(key: KeyRecord): Promise<Record<string, string>> {
  const minute = await consumeRateLimit({
    key: `api:key:${key.id}:minute`,
    limit: key.rateLimitPerMinute,
    windowMs: MINUTE_MS,
  });
  if (!minute.allowed) {
    throw tooManyRequests(minute, 'rate_limited', 'Rate limit exceeded for this key.');
  }

  if (key.dailyQuota !== null) {
    const day = await consumeRateLimit({
      key: `api:key:${key.id}:day`,
      limit: key.dailyQuota,
      windowMs: DAY_MS,
    });
    if (!day.allowed) {
      throw tooManyRequests(day, 'daily_quota_exceeded', 'Daily quota exceeded for this key.');
    }
  }
  return rateLimitHeaders(minute);
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
      const key = await authenticate(request, trace);
      if (options.notFound) throw new ApiError(404, 'not_found', 'No such endpoint.');
      enforcePolicy(key, meta, options.scope);
      const limitHeaders = await enforceLimits(key);

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
      await recordApiRequest(record);
      if (record.apiKeyId && record.outcome === 'success') {
        await touchKeyUsage(record.apiKeyId, record.ip).catch((error) => {
          logger.warn('failed to update key usage', { error });
        });
      }
      await inspectApiRequest(record, { watched: trace.watched });
      await kickBackgroundWork();
    });

    return response;
  };
}
