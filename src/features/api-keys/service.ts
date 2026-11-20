import 'server-only';
import type { ApiKeyPolicyInput, ApiKeyRecord } from '@vantedev/groundwork/api-keys';
import { and, gt, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiRequests } from '@/db/schema';
import { gw } from '@/lib/groundwork';
import type { CreateApiKeyInput, UpdateApiKeyInput } from './schema';
import type { ApiScope } from './scopes';

// Every change below is recorded in the audit log by groundwork (api_key.create, api_key.rotate,
// …), in the same transaction as the change.

/**
 * A key as the console and the API show it. Keys are stored and verified by groundwork; this is
 * its record in the shape this app already used, so pages and handlers didn't have to change.
 */
export interface KeyRecord {
  id: string;
  name: string;
  description: string | null;
  /** The 12 hex characters after `vnt_`; `displayPrefix` adds the namespace. */
  prefix: string;
  scopes: ApiScope[];
  rateLimitPerMinute: number;
  dailyQuota: number | null;
  allowedOrigins: string[];
  allowedIps: string[];
  expectedCountries: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  suspendedUntil: Date | null;
  suspendedReason: string | null;
  rotatedAt: Date | null;
  previousKeyExpiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Every key this app creates has a per-minute limit; this is groundwork's default too. */
const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;

export function toKeyRecord(key: ApiKeyRecord<ApiScope>): KeyRecord {
  const countries = key.metadata?.expectedCountries;
  return {
    id: key.id,
    name: key.name,
    description: key.description,
    prefix: key.prefix.replace(/^vnt_/, ''),
    // This app never grants `resource:*` wildcards, so every granted scope is a declared one.
    scopes: [...key.scopes] as ApiScope[],
    rateLimitPerMinute: key.rateLimit?.limit ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
    dailyQuota: key.dailyQuota,
    allowedOrigins: [...key.allowedOrigins],
    allowedIps: [...key.allowedIps],
    expectedCountries: Array.isArray(countries) ? countries.map(String) : [],
    expiresAt: key.expiresAt,
    revokedAt: key.revokedAt,
    revokedReason: key.revokedReason,
    suspendedUntil: key.suspendedUntil,
    suspendedReason: key.suspendedReason,
    rotatedAt: key.rotatedAt,
    previousKeyExpiresAt: key.previousKeyExpiresAt,
    lastUsedAt: key.lastUsedAt,
    lastUsedIp: key.lastUsedIp,
    createdBy: key.createdBy,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

function toPolicy(input: Omit<CreateApiKeyInput, 'expiresAt'>): ApiKeyPolicyInput<ApiScope> {
  return {
    name: input.name,
    description: input.description || null,
    scopes: input.scopes,
    rateLimit: { limit: input.rateLimitPerMinute, window: '1m' },
    dailyQuota: input.dailyQuota,
    allowedOrigins: input.allowedOrigins,
    allowedIps: input.allowedIps,
    metadata: { expectedCountries: input.expectedCountries },
  };
}

const asUser = (actor: string) => ({ actor: { type: 'user', label: actor } });

export async function createApiKey(input: CreateApiKeyInput, actor: string) {
  const { key, record } = await gw().apiKeys.create(
    { ...toPolicy(input), expiresAt: input.expiresAt },
    asUser(actor),
  );
  const view = toKeyRecord(record);
  return { record: view, key };
}

export async function updateApiKey({ id, ...input }: UpdateApiKeyInput, actor: string) {
  const record = await gw().apiKeys.update(
    id,
    { ...toPolicy(input), expiresAt: input.expiresAt },
    asUser(actor),
  );
  if (!record) return null;
  const view = toKeyRecord(record);
  return view;
}

export async function rotateApiKey(id: string, graceHours: number, actor: string) {
  const rotated = await gw().apiKeys.rotate(id, { ...asUser(actor), grace: `${graceHours}h` });
  if (!rotated) return null;
  const view = toKeyRecord(rotated.record);
  return { record: view, key: rotated.key };
}

export async function revokeApiKey(id: string, reason: string, actor: string) {
  const record = await gw().apiKeys.revoke(id, { ...asUser(actor), reason: reason || undefined });
  if (!record) return null;
  const view = toKeyRecord(record);
  return view;
}

export async function suspendApiKey(id: string, minutes: number, reason: string, actor: string) {
  const record = await gw().apiKeys.suspend(id, {
    ...asUser(actor),
    for: `${minutes}m`,
    reason: reason || undefined,
  });
  if (!record) return null;
  const view = toKeyRecord(record);
  return view;
}

export async function reinstateApiKey(id: string, actor: string) {
  const record = await gw().apiKeys.reinstate(id, asUser(actor));
  if (!record) return null;
  const view = toKeyRecord(record);
  return view;
}

export async function deleteRevokedApiKey(id: string, actor: string) {
  const existing = await gw().apiKeys.get(id);
  if (!existing?.revokedAt) return null;
  if (!(await gw().apiKeys.delete(id, asUser(actor)))) return null;
  return { id: existing.id, name: existing.name };
}

export async function getApiKey(id: string) {
  const record = await gw().apiKeys.get(id);
  return record ? toKeyRecord(record) : null;
}

export async function listApiKeys() {
  const keys = await gw().apiKeys.list();
  const ids = keys.map((key) => key.id);
  const usage =
    ids.length === 0
      ? []
      : await db
          .select({
            apiKeyId: apiRequests.apiKeyId,
            requests24h: sql<number>`count(*)::int`,
            errors24h: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)::int`,
          })
          .from(apiRequests)
          .where(
            and(
              inArray(apiRequests.apiKeyId, ids),
              gt(apiRequests.createdAt, sql`now() - interval '24 hours'`),
            ),
          )
          .groupBy(apiRequests.apiKeyId);
  const byKey = new Map(usage.map((row) => [row.apiKeyId, row]));
  return keys.map((key) => ({
    ...toKeyRecord(key),
    requests24h: byKey.get(key.id)?.requests24h ?? 0,
    errors24h: byKey.get(key.id)?.errors24h ?? 0,
  }));
}
