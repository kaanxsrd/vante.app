import 'server-only';
import { and, eq, gt, gte, isNotNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, apiRequests, authAttempts } from '@/db/schema';
import type { ApiRequestRecord } from '@/features/api-monitoring/record';
import { logger } from '@/lib/logger';
import { createTrailingThrottle } from '@/lib/throttle';
import {
  evaluateGeo,
  evaluateIpStats,
  evaluateKeyStats,
  evaluateServiceHealth,
  evaluateTraffic,
  type Finding,
  type RuleSet,
} from './evaluate';
import { type EventContext, getSecurityRules, raiseSecurityEvent } from './service';

const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

const EVALUATION_SPACING_MS = 5_000;

const throttleEvaluation = createTrailingThrottle(EVALUATION_SPACING_MS);

function contextFrom(record: ApiRequestRecord): EventContext {
  return {
    apiKeyId: record.apiKeyId,
    keyPrefix: record.keyPrefix,
    endpoint: record.endpoint,
    method: record.method,
    ip: record.ip,
    country: record.country,
    origin: record.origin,
    userAgent: record.userAgent,
    statusCode: record.statusCode,
  };
}

async function raiseAll(findings: Finding[], rules: RuleSet, context: EventContext) {
  await Promise.all(findings.map((f) => raiseSecurityEvent(f, rules[f.ruleId], context)));
}

async function checkKeyWindow(record: ApiRequestRecord, rules: RuleSet) {
  if (!record.apiKeyId) return;

  const window = (seconds: number) => sql.raw(`now() - interval '${Math.floor(seconds)} seconds'`);
  const longest = Math.max(
    rules.request_spike.windowSeconds,
    rules.rate_limit_abuse.windowSeconds,
    rules.credential_abuse.windowSeconds,
    rules.endpoint_anomaly.windowSeconds,
  );

  const [stats] = await db
    .select({
      requests: sql<number>`count(*) filter (where ${apiRequests.createdAt} > ${window(rules.request_spike.windowSeconds)})::int`,
      rateLimited: sql<number>`count(*) filter (where ${apiRequests.outcome} = 'rate_limited' and ${apiRequests.createdAt} > ${window(rules.rate_limit_abuse.windowSeconds)})::int`,
      distinctIps: sql<number>`count(distinct ${apiRequests.ip}) filter (where ${apiRequests.createdAt} > ${window(rules.credential_abuse.windowSeconds)})::int`,
      failedEndpoints: sql<number>`count(*) filter (where ${apiRequests.statusCode} in (403, 404) and ${apiRequests.createdAt} > ${window(rules.endpoint_anomaly.windowSeconds)})::int`,
    })
    .from(apiRequests)
    .where(
      and(
        eq(apiRequests.apiKeyId, record.apiKeyId),
        gt(apiRequests.createdAt, secondsAgo(longest)),
      ),
    );
  if (!stats) return;

  await raiseAll(evaluateKeyStats(record.apiKeyId, stats, rules), rules, contextFrom(record));
}

async function checkIpWindow(record: ApiRequestRecord, rules: RuleSet) {
  if (!record.ip) return;

  const window = (seconds: number) => sql.raw(`now() - interval '${Math.floor(seconds)} seconds'`);
  const longest = Math.max(
    rules.invalid_key_abuse.windowSeconds,
    rules.suspicious_ip.windowSeconds,
    rules.endpoint_anomaly.windowSeconds,
  );

  const [stats] = await db
    .select({
      invalidKeyAttempts: sql<number>`count(*) filter (where ${apiRequests.errorCode} = 'invalid_api_key' and ${apiRequests.createdAt} > ${window(rules.invalid_key_abuse.windowSeconds)})::int`,
      distinctKeyPrefixes: sql<number>`count(distinct ${apiRequests.keyPrefix}) filter (where ${apiRequests.createdAt} > ${window(rules.suspicious_ip.windowSeconds)})::int`,
      failedEndpoints: sql<number>`count(*) filter (where ${apiRequests.statusCode} = 404 and ${apiRequests.createdAt} > ${window(rules.endpoint_anomaly.windowSeconds)})::int`,
    })
    .from(apiRequests)
    .where(and(eq(apiRequests.ip, record.ip), gt(apiRequests.createdAt, secondsAgo(longest))));
  if (!stats) return;

  await raiseAll(evaluateIpStats(record.ip, stats, rules), rules, contextFrom(record));
}

async function checkGeography(record: ApiRequestRecord, rules: RuleSet) {
  if (!record.apiKeyId || !record.country || !rules.geo_anomaly.enabled) return;

  const [key] = await db
    .select({ expectedCountries: apiKeys.expectedCountries })
    .from(apiKeys)
    .where(eq(apiKeys.id, record.apiKeyId));
  if (!key) return;

  const since = secondsAgo(rules.geo_anomaly.windowSeconds);
  const known = await db
    .selectDistinct({ country: apiRequests.country })
    .from(apiRequests)
    .where(
      and(
        eq(apiRequests.apiKeyId, record.apiKeyId),
        gt(apiRequests.createdAt, since),
        isNotNull(apiRequests.country),
        ne(apiRequests.requestId, record.requestId),
      ),
    );
  const [prior] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(apiRequests)
    .where(and(eq(apiRequests.apiKeyId, record.apiKeyId), gt(apiRequests.createdAt, since)));

  const finding = evaluateGeo(
    {
      keyId: record.apiKeyId,
      country: record.country,
      knownCountries: known.flatMap((row) => (row.country ? [row.country] : [])),
      expectedCountries: key.expectedCountries,
      priorRequests: Math.max((prior?.value ?? 1) - 1, 0),
    },
    rules,
  );
  if (finding) await raiseSecurityEvent(finding, rules.geo_anomaly, contextFrom(record));
}

function immediateFindings(record: ApiRequestRecord): Finding[] {
  const subjectKey = record.apiKeyId ?? record.keyPrefix ?? record.ip ?? 'unknown';
  switch (record.errorCode) {
    case 'revoked_api_key':
    case 'expired_api_key':
      return [
        {
          ruleId: 'revoked_key_use',
          subject: `key:${subjectKey}`,
          summary: `A ${record.errorCode === 'revoked_api_key' ? 'revoked' : 'expired'} key was presented with its correct secret.`,
          details: { errorCode: record.errorCode },
        },
      ];
    case 'origin_not_allowed':
      return [
        {
          ruleId: 'unexpected_origin',
          subject: `key:${subjectKey}:origin:${record.origin}`,
          summary: `Request from ${record.origin}, which is not on this key's allow-list.`,
          details: { origin: record.origin },
        },
      ];
    case 'ip_blocked':
    case 'ip_not_allowed':
      return [
        {
          ruleId: 'suspicious_ip',
          subject: `ip:${record.ip}:${record.errorCode}`,
          summary:
            record.errorCode === 'ip_blocked'
              ? 'A blocked IP address attempted to use the API.'
              : 'A key was used from an IP address outside its allow-list.',
          details: { errorCode: record.errorCode },
        },
      ];
    default:
      return [];
  }
}

export async function inspectApiRequest(
  record: ApiRequestRecord,
  options: { watched?: boolean } = {},
): Promise<void> {
  try {
    const rules = await getSecurityRules();
    const context = contextFrom(record);

    await raiseAll(immediateFindings(record), rules, context);
    if (options.watched) {
      await raiseSecurityEvent(
        {
          ruleId: 'suspicious_ip',
          subject: `ip:${record.ip}:watch`,
          summary: 'An IP address on the watch list used the API.',
          details: { path: record.path },
        },
        rules.suspicious_ip,
        context,
      );
    }
    await Promise.all([
      throttleEvaluation(`key:${record.apiKeyId}`, () => checkKeyWindow(record, rules)),
      throttleEvaluation(`ip:${record.ip}`, () => checkIpWindow(record, rules)),
      throttleEvaluation(`geo:${record.apiKeyId}:${record.country}`, () =>
        checkGeography(record, rules),
      ),
    ]);
  } catch (error) {
    logger.error('security inspection failed', { error });
  }
}

export async function inspectAuthFailure(context: {
  ip: string | null;
  country: string | null;
  userAgent: string | null;
}): Promise<void> {
  if (!context.ip) return;
  try {
    const rules = await getSecurityRules();
    const rule = rules.auth_failures;
    const [row] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.ip, context.ip),
          eq(authAttempts.success, false),
          gt(authAttempts.createdAt, secondsAgo(rule.windowSeconds)),
        ),
      );
    const failures = row?.value ?? 0;
    if (failures < rule.threshold) return;

    await raiseSecurityEvent(
      {
        ruleId: 'auth_failures',
        subject: `ip:${context.ip}`,
        summary: `${failures} failed sign-ins in ${rule.windowSeconds / 60} minutes.`,
        details: { failures },
      },
      rule,
      { ...context, endpoint: 'admin sign-in', method: 'POST', statusCode: 401 },
    );
  } catch (error) {
    logger.error('auth failure inspection failed', { error });
  }
}

export async function runSecurityScan(): Promise<void> {
  const rules = await getSecurityRules();

  const trafficWindow = rules.traffic_anomaly.windowSeconds;
  const [traffic] = await db
    .select({
      recent: sql<number>`count(*) filter (where ${apiRequests.createdAt} >= ${secondsAgo(trafficWindow).toISOString()}::timestamptz)::int`,
      baseline: sql<number>`count(*) filter (where ${apiRequests.createdAt} < ${secondsAgo(trafficWindow).toISOString()}::timestamptz)::int`,
    })
    .from(apiRequests)
    .where(gte(apiRequests.createdAt, secondsAgo(86_400 + trafficWindow)));
  if (traffic) {
    const finding = evaluateTraffic(
      {
        recentRequests: traffic.recent,
        baselinePerWindow: (traffic.baseline / 86_400) * trafficWindow,
      },
      rules,
    );
    if (finding) await raiseSecurityEvent(finding, rules.traffic_anomaly);
  }

  const [health] = await db
    .select({
      total: sql<number>`count(*)::int`,
      serverErrors: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 500)::int`,
    })
    .from(apiRequests)
    .where(gte(apiRequests.createdAt, secondsAgo(rules.service_failure.windowSeconds)));
  if (health) {
    const finding = evaluateServiceHealth(health, rules);
    if (finding) await raiseSecurityEvent(finding, rules.service_failure, { statusCode: 500 });
  }
}
