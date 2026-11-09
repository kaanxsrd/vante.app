import 'server-only';
import { and, desc, eq, gt, ilike, inArray, isNull, lte, or, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, ipRules, securityEvents, securityRules } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import { queueSecurityNotification } from '@/features/notifications/service';
import type { Severity } from '@/features/settings/schema';
import { logger } from '@/lib/logger';
import type { Finding, RuleSet } from './evaluate';
import { defaultRuleConfig, isRuleId, RULE_IDS, RULES, type RuleConfig } from './rules';

export interface EventContext {
  apiKeyId?: string | null;
  keyPrefix?: string | null;
  endpoint?: string | null;
  method?: string | null;
  ip?: string | null;
  country?: string | null;
  origin?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
}

export async function getSecurityRules(): Promise<RuleSet> {
  const stored = await db.select().from(securityRules);
  const rules = Object.fromEntries(RULE_IDS.map((id) => [id, defaultRuleConfig(id)])) as RuleSet;
  for (const row of stored) {
    if (isRuleId(row.ruleId)) rules[row.ruleId] = { ...row, ruleId: row.ruleId };
  }
  return rules;
}

export async function saveSecurityRule(config: RuleConfig, actor: string): Promise<void> {
  const safe = {
    ...config,
    autoSuspend: RULES[config.ruleId].canAutoSuspend && config.autoSuspend,
  };
  await db
    .insert(securityRules)
    .values(safe)
    .onConflictDoUpdate({
      target: securityRules.ruleId,
      set: { ...safe, updatedAt: new Date() },
    });
  await recordAudit({
    actor,
    action: 'security.rule_update',
    entityType: 'security_rule',
    entityId: config.ruleId,
    summary: `Updated rule "${RULES[config.ruleId].label}"`,
    metadata: { ...safe },
  });
}

async function maybeAutoSuspend(rule: RuleConfig, context: EventContext): Promise<string | null> {
  if (!rule.autoSuspend || !RULES[rule.ruleId].canAutoSuspend || !context.apiKeyId) return null;

  const until = new Date(Date.now() + rule.suspendMinutes * 60_000);
  const [suspended] = await db
    .update(apiKeys)
    .set({
      suspendedUntil: until,
      suspendedReason: `Automatic: ${RULES[rule.ruleId].label}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(apiKeys.id, context.apiKeyId),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.suspendedUntil), lte(apiKeys.suspendedUntil, new Date())),
      ),
    )
    .returning({ id: apiKeys.id, name: apiKeys.name });
  if (!suspended) return null;

  await recordAudit({
    actor: 'system',
    action: 'api_key.auto_suspend',
    entityType: 'api_key',
    entityId: suspended.id,
    summary: `Automatically suspended API key "${suspended.name}" for ${rule.suspendMinutes} minutes`,
    metadata: { ruleId: rule.ruleId },
    ip: null,
  });
  return `Key suspended automatically for ${rule.suspendMinutes} minutes`;
}

export async function raiseSecurityEvent(
  finding: Finding,
  rule: RuleConfig,
  context: EventContext = {},
): Promise<{ id: string; created: boolean } | null> {
  if (!rule.enabled) return null;
  const definition = RULES[finding.ruleId];
  const fingerprint = `${finding.ruleId}:${finding.subject}`;
  const now = new Date();

  try {
    const [existing] = await db
      .update(securityEvents)
      .set({
        occurrences: sql`${securityEvents.occurrences} + 1`,
        lastSeenAt: now,
        summary: finding.summary,
        details: finding.details,
      })
      .where(
        and(
          eq(securityEvents.fingerprint, fingerprint),
          inArray(securityEvents.status, ['open', 'acknowledged']),
          gt(securityEvents.lastSeenAt, new Date(now.getTime() - rule.cooldownSeconds * 1000)),
        ),
      )
      .returning({ id: securityEvents.id });
    if (existing) {
      await maybeAutoSuspend(rule, context);
      return { id: existing.id, created: false };
    }

    const actionTaken = await maybeAutoSuspend(rule, context);
    const [event] = await db
      .insert(securityEvents)
      .values({
        ruleId: finding.ruleId,
        title: definition.label,
        summary: finding.summary,
        severity: rule.severity,
        classification: definition.classification,
        fingerprint,
        apiKeyId: context.apiKeyId ?? null,
        keyPrefix: context.keyPrefix ?? null,
        endpoint: context.endpoint ?? null,
        method: context.method ?? null,
        ip: context.ip ?? null,
        country: context.country ?? null,
        origin: context.origin ?? null,
        userAgent: context.userAgent ?? null,
        statusCode: context.statusCode ?? null,
        details: finding.details,
        actionTaken,
      })
      .returning();
    if (!event) return null;

    if (rule.notify || event.severity === 'critical') await queueSecurityNotification(event);
    return { id: event.id, created: true };
  } catch (error) {
    logger.error('failed to record security event', { ruleId: finding.ruleId, error });
    return null;
  }
}

export async function listSecurityEvents(filters: {
  q?: string;
  severity?: Severity;
  status?: string;
  classification?: string;
  ruleId?: string;
  page: number;
  pageSize: number;
}) {
  const conditions: SQL[] = [];
  if (filters.severity) conditions.push(eq(securityEvents.severity, filters.severity));
  if (filters.ruleId) conditions.push(eq(securityEvents.ruleId, filters.ruleId));
  if (filters.status) {
    conditions.push(
      eq(securityEvents.status, filters.status as typeof securityEvents.$inferSelect.status),
    );
  }
  if (filters.classification) {
    conditions.push(
      eq(
        securityEvents.classification,
        filters.classification as typeof securityEvents.$inferSelect.classification,
      ),
    );
  }
  if (filters.q) {
    const term = `%${filters.q}%`;
    const match = or(
      ilike(securityEvents.ip, term),
      ilike(securityEvents.keyPrefix, term),
      ilike(securityEvents.endpoint, term),
      ilike(securityEvents.title, term),
    );
    if (match) conditions.push(match);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(securityEvents)
      .where(where)
      .orderBy(desc(securityEvents.lastSeenAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: sql<number>`count(*)::int` }).from(securityEvents).where(where),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}

export async function getSecurityEvent(id: string) {
  const [event] = await db.select().from(securityEvents).where(eq(securityEvents.id, id)).limit(1);
  return event ?? null;
}

export type EventStatus = typeof securityEvents.$inferSelect.status;

export async function updateEventStatus(
  id: string,
  status: EventStatus,
  note: string,
  actor: string,
) {
  const [event] = await db
    .update(securityEvents)
    .set({
      status,
      resolutionNote: note || null,
      resolvedAt: status === 'resolved' || status === 'false_positive' ? new Date() : null,
    })
    .where(eq(securityEvents.id, id))
    .returning({ id: securityEvents.id, title: securityEvents.title });
  if (!event) return null;
  await recordAudit({
    actor,
    action: 'security.event_status',
    entityType: 'security_event',
    entityId: event.id,
    summary: `Marked incident "${event.title}" as ${status.replace('_', ' ')}`,
  });
  return event;
}

export async function confirmThreat(id: string, note: string, actor: string) {
  const [event] = await db
    .update(securityEvents)
    .set({ classification: 'confirmed_threat', resolutionNote: note || null })
    .where(eq(securityEvents.id, id))
    .returning({ id: securityEvents.id, title: securityEvents.title });
  if (!event) return null;
  await recordAudit({
    actor,
    action: 'security.confirm_threat',
    entityType: 'security_event',
    entityId: event.id,
    summary: `Confirmed incident "${event.title}" as a real threat`,
  });
  return event;
}

export async function listIpRules() {
  return db.select().from(ipRules).orderBy(desc(ipRules.createdAt));
}

export async function saveIpRule(
  input: { ip: string; action: 'watch' | 'block'; reason: string; expiresAt: Date | null },
  actor: string,
) {
  const values = { ...input, reason: input.reason || null };
  await db.insert(ipRules).values(values).onConflictDoUpdate({ target: ipRules.ip, set: values });
  await recordAudit({
    actor,
    action: 'security.ip_rule',
    entityType: 'ip_rule',
    entityId: input.ip,
    summary: `${input.action === 'block' ? 'Blocked' : 'Watching'} IP address ${input.ip}`,
    metadata: { reason: input.reason },
  });
}

export async function deleteIpRule(id: string, actor: string) {
  const [rule] = await db
    .delete(ipRules)
    .where(eq(ipRules.id, id))
    .returning({ ip: ipRules.ip, action: ipRules.action });
  if (!rule) return null;
  await recordAudit({
    actor,
    action: 'security.ip_rule_delete',
    entityType: 'ip_rule',
    entityId: rule.ip,
    summary: `Removed the ${rule.action} rule for IP address ${rule.ip}`,
  });
  return rule;
}

export async function getIpRuleAction(ip: string | null): Promise<'watch' | 'block' | null> {
  if (!ip) return null;
  const [rule] = await db
    .select({ action: ipRules.action })
    .from(ipRules)
    .where(
      and(eq(ipRules.ip, ip), or(isNull(ipRules.expiresAt), gt(ipRules.expiresAt, new Date()))),
    )
    .limit(1);
  return rule?.action ?? null;
}
