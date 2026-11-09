import 'server-only';
import { desc, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/request-meta';

export interface AuditEntry {
  actor: string;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

async function currentIp(): Promise<string | null> {
  try {
    return getClientIp(await headers());
  } catch {
    return null;
  }
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actor: entry.actor,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      metadata: entry.metadata ?? {},
      ip: entry.ip === undefined ? await currentIp() : entry.ip,
    });
  } catch (error) {
    logger.error('audit write failed', { action: entry.action, error });
  }
}

export async function listAuditLogs({ limit = 50, offset = 0 } = {}) {
  const [rows, total] = await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
    db.select({ value: sql<number>`count(*)::int` }).from(auditLogs),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}
