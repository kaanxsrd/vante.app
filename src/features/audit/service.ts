import 'server-only';
import type { AuditActor } from '@vantedev/groundwork/audit';
import { desc, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/db';
import { gwAuditLog } from '@/db/schema';
import { gw } from '@/lib/groundwork';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/request-meta';
import type { AuditAction } from './actions';

export interface AuditEntry {
  /** An admin's email, `system`, or `api-key:vnt_…` for changes made through the API. */
  actor: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/** An entry as the console shows it. */
export interface AuditRow {
  id: number;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
}

function actorOf(actor: string): AuditActor {
  if (actor === 'system') return { type: 'system' };
  if (actor.startsWith('api-key:')) return { type: 'api_key', label: actor };
  return { type: 'user', label: actor };
}

async function currentIp(): Promise<string | null> {
  try {
    return getClientIp(await headers());
  } catch {
    return null;
  }
}

/** Records an entry with groundwork. A failure is logged, never thrown at the caller. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await gw().audit.record({
      actor: actorOf(entry.actor),
      action: entry.action,
      entity: entry.entityType ? { type: entry.entityType, id: entry.entityId ?? null } : null,
      summary: entry.summary,
      metadata: entry.metadata ?? null,
      ip: entry.ip === undefined ? await currentIp() : entry.ip,
    });
  } catch (error) {
    logger.error('audit write failed', { action: entry.action, error });
  }
}

const row = (entry: typeof gwAuditLog.$inferSelect): AuditRow => ({
  id: entry.id,
  actor: entry.actorLabel ?? entry.actorType,
  action: entry.action,
  entityType: entry.entityType,
  entityId: entry.entityId,
  summary: entry.summary,
  metadata: entry.metadata,
  ip: entry.ip,
  createdAt: entry.occurredAt,
});

/**
 * One page of the log, newest first. The console pages by number, so this reads groundwork's
 * table directly with an offset; groundwork's own `query()` pages by cursor.
 */
export async function listAuditLogs({ limit = 50, offset = 0 } = {}) {
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(gwAuditLog)
      .orderBy(desc(gwAuditLog.occurredAt), desc(gwAuditLog.id))
      .limit(limit)
      .offset(offset),
    db.select({ value: sql<number>`count(*)::int` }).from(gwAuditLog),
  ]);
  return { rows: rows.map(row), total: total[0]?.value ?? 0 };
}

/** The latest entries, for the overview. */
export async function recentAuditLogs(limit = 8): Promise<AuditRow[]> {
  const rows = await db
    .select()
    .from(gwAuditLog)
    .orderBy(desc(gwAuditLog.occurredAt), desc(gwAuditLog.id))
    .limit(limit);
  return rows.map(row);
}

/** Deletes entries older than `days`. */
export function pruneAuditLogs(days: number): Promise<number> {
  return gw().audit.prune({ olderThan: `${days}d` });
}
