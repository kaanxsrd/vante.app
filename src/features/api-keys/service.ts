import 'server-only';
import { and, desc, eq, getTableColumns, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, apiRequests } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import { requireSecret } from '@/lib/env';
import { generateApiKey, hashApiKey } from './crypto';
import type { CreateApiKeyInput, UpdateApiKeyInput } from './schema';

const {
  keyHash: _keyHash,
  previousKeyHash: _previousKeyHash,
  ...safeColumns
} = getTableColumns(apiKeys);

const apiKeySafeColumns = safeColumns;

function pepper(): string {
  return requireSecret('API_KEY_PEPPER');
}

export async function createApiKey(input: CreateApiKeyInput, actor: string) {
  const generated = generateApiKey(pepper());
  const [record] = await db
    .insert(apiKeys)
    .values({
      ...input,
      prefix: generated.prefix,
      keyHash: generated.hash,
      createdBy: actor,
    })
    .returning(apiKeySafeColumns);
  if (!record) throw new Error('insert returned no row');

  await recordAudit({
    actor,
    action: 'api_key.create',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Created API key "${record.name}" (${record.prefix})`,
    metadata: { scopes: record.scopes },
  });
  return { record, key: generated.key };
}

export async function updateApiKey({ id, ...input }: UpdateApiKeyInput, actor: string) {
  const [record] = await db
    .update(apiKeys)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning(apiKeySafeColumns);
  if (!record) return null;
  await recordAudit({
    actor,
    action: 'api_key.update',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Updated API key "${record.name}"`,
    metadata: { scopes: record.scopes },
  });
  return record;
}

export async function rotateApiKey(id: string, graceHours: number, actor: string) {
  const generated = generateApiKey(pepper());
  const now = new Date();
  const [record] = await db
    .update(apiKeys)
    .set({
      keyHash: generated.hash,
      prefix: generated.prefix,
      previousKeyHash: graceHours > 0 ? sql`${apiKeys.keyHash}` : null,
      previousKeyExpiresAt:
        graceHours > 0 ? new Date(now.getTime() + graceHours * 3_600_000) : null,
      rotatedAt: now,
      updatedAt: now,
    })
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .returning(apiKeySafeColumns);
  if (!record) return null;

  await recordAudit({
    actor,
    action: 'api_key.rotate',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Rotated API key "${record.name}" with a ${graceHours}h grace period`,
    metadata: { graceHours, prefix: record.prefix },
  });
  return { record, key: generated.key };
}

export async function revokeApiKey(id: string, reason: string, actor: string) {
  const now = new Date();
  const [record] = await db
    .update(apiKeys)
    .set({
      revokedAt: now,
      revokedReason: reason || null,
      previousKeyHash: null,
      previousKeyExpiresAt: null,
      updatedAt: now,
    })
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .returning(apiKeySafeColumns);
  if (!record) return null;
  await recordAudit({
    actor,
    action: 'api_key.revoke',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Revoked API key "${record.name}"${reason ? `: ${reason}` : ''}`,
  });
  return record;
}

export async function suspendApiKey(id: string, minutes: number, reason: string, actor: string) {
  const until = new Date(Date.now() + minutes * 60_000);
  const [record] = await db
    .update(apiKeys)
    .set({ suspendedUntil: until, suspendedReason: reason || null, updatedAt: new Date() })
    .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .returning(apiKeySafeColumns);
  if (!record) return null;
  await recordAudit({
    actor,
    action: 'api_key.suspend',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Suspended API key "${record.name}" for ${minutes} minutes`,
    metadata: { reason },
  });
  return record;
}

export async function reinstateApiKey(id: string, actor: string) {
  const [record] = await db
    .update(apiKeys)
    .set({ suspendedUntil: null, suspendedReason: null, updatedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning(apiKeySafeColumns);
  if (!record) return null;
  await recordAudit({
    actor,
    action: 'api_key.reinstate',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Lifted the suspension on API key "${record.name}"`,
  });
  return record;
}

export async function deleteRevokedApiKey(id: string, actor: string) {
  const [record] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), isNotNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id, name: apiKeys.name });
  if (!record) return null;
  await recordAudit({
    actor,
    action: 'api_key.delete',
    entityType: 'api_key',
    entityId: record.id,
    summary: `Deleted revoked API key "${record.name}"`,
  });
  return record;
}

export async function getApiKey(id: string) {
  const [record] = await db.select(apiKeySafeColumns).from(apiKeys).where(eq(apiKeys.id, id));
  return record ?? null;
}

export async function listApiKeys() {
  const usage = db
    .select({
      apiKeyId: apiRequests.apiKeyId,
      requests24h: sql<number>`count(*)::int`.as('requests_24h'),
      errors24h: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 400)::int`.as(
        'errors_24h',
      ),
    })
    .from(apiRequests)
    .where(gt(apiRequests.createdAt, sql`now() - interval '24 hours'`))
    .groupBy(apiRequests.apiKeyId)
    .as('usage');

  return db
    .select({
      ...apiKeySafeColumns,
      requests24h: sql<number>`coalesce(${usage.requests24h}, 0)::int`,
      errors24h: sql<number>`coalesce(${usage.errors24h}, 0)::int`,
    })
    .from(apiKeys)
    .leftJoin(usage, eq(usage.apiKeyId, apiKeys.id))
    .orderBy(desc(apiKeys.createdAt));
}

export type KeyRecord = typeof apiKeys.$inferSelect;

export async function findKeyBySecret(rawKey: string): Promise<KeyRecord | null> {
  const hash = hashApiKey(rawKey, pepper());
  const [record] = await db
    .select()
    .from(apiKeys)
    .where(
      or(
        eq(apiKeys.keyHash, hash),
        and(eq(apiKeys.previousKeyHash, hash), gt(apiKeys.previousKeyExpiresAt, new Date())),
      ),
    )
    .limit(1);
  return record ?? null;
}

export async function touchKeyUsage(id: string, ip: string | null): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), lastUsedIp: ip })
    .where(eq(apiKeys.id, id));
}
