import 'server-only';
import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, type SecurityEventRow } from '@/db/schema';
import { enqueueJob, JOB_NOTIFICATION_DELIVER } from '@/features/jobs/queue';
import { getEmailBrand } from '@/features/profile/brand';
import { CLASSIFICATION_LABELS } from '@/features/security/labels';
import { isRuleId, RULES } from '@/features/security/rules';
import type {
  NotificationCategory,
  NotificationSettings,
  Severity,
} from '@/features/settings/schema';
import { SEVERITIES } from '@/features/settings/schema';
import { getSetting } from '@/features/settings/service';
import { EmailNotConfiguredError, sendEmail } from '@/lib/email';
import { adminBasePath, getEnv, siteUrl } from '@/lib/env';
import { logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import { securityAlertEmail, testEmail } from './templates';

const MAX_ALERTS_PER_HOUR = 60;

export function resolveRecipient(settings: NotificationSettings): string | null {
  const env = getEnv();
  return settings.recipient ?? env.SECURITY_ALERT_EMAIL ?? env.ADMIN_EMAIL ?? null;
}

export function shouldNotify(
  settings: NotificationSettings,
  category: NotificationCategory | null,
  severity: Severity,
): boolean {
  if (!settings.enabled) return false;
  if (severity === 'critical') return true;
  if (SEVERITIES.indexOf(severity) < SEVERITIES.indexOf(settings.minSeverity)) return false;
  return category ? settings.categories[category] : true;
}

function incidentUrl(eventId: string): string | null {
  const base = adminBasePath();
  return base ? `${siteUrl()}${base}/security/${eventId}` : null;
}

export async function queueSecurityNotification(event: SecurityEventRow): Promise<void> {
  try {
    const settings = await getSetting('notifications');
    const definition = isRuleId(event.ruleId) ? RULES[event.ruleId] : null;
    const category = definition?.category ?? null;
    if (!shouldNotify(settings, category, event.severity)) return;

    const recipient = resolveRecipient(settings);
    if (!recipient) {
      logger.warn('no recipient for security notification', { eventId: event.id });
      return;
    }

    const budget = await consumeRateLimit({
      key: 'alerts:global',
      limit: MAX_ALERTS_PER_HOUR,
      windowMs: 3_600_000,
    });
    if (!budget.allowed) {
      logger.warn('security alert not sent: hourly cap reached', { eventId: event.id });
      return;
    }

    const brand = await getEmailBrand();
    const email = securityAlertEmail(
      {
        title: event.title,
        summary: event.summary,
        severity: event.severity,
        classificationLabel: CLASSIFICATION_LABELS[event.classification],
        occurredAt: event.firstSeenAt,
        keyPrefix: event.keyPrefix,
        endpoint: event.endpoint,
        method: event.method,
        ip: event.ip,
        country: event.country,
        origin: event.origin,
        statusCode: event.statusCode,
        actionTaken: event.actionTaken,
        recommendedActions: definition?.recommendedActions ?? [
          'Review the incident in your dashboard.',
        ],
        dashboardUrl: incidentUrl(event.id),
      },
      brand,
    );

    const notificationId = await createNotification({
      category: category ?? 'security',
      severity: event.severity,
      recipient,
      subject: email.subject,
      html: email.html,
      textBody: email.text,
      securityEventId: event.id,
    });
    await enqueueJob(JOB_NOTIFICATION_DELIVER, { notificationId });
  } catch (error) {
    logger.error('failed to queue security notification', { eventId: event.id, error });
  }
}

async function createNotification(values: typeof notifications.$inferInsert): Promise<string> {
  const [row] = await db.insert(notifications).values(values).returning({ id: notifications.id });
  if (!row) throw new Error('insert returned no row');
  return row.id;
}

export async function deliverNotification(id: string): Promise<void> {
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  if (!row || row.status === 'sent') return;

  await db
    .update(notifications)
    .set({ attempts: sql`${notifications.attempts} + 1` })
    .where(eq(notifications.id, id));

  try {
    const result = await sendEmail({
      to: row.recipient,
      subject: row.subject,
      html: row.html,
      text: row.textBody,
    });
    await db
      .update(notifications)
      .set({
        status: 'sent',
        provider: result.provider,
        providerMessageId: result.messageId,
        error: null,
        sentAt: new Date(),
      })
      .where(eq(notifications.id, id));
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      await db
        .update(notifications)
        .set({ status: 'skipped', error: error.message })
        .where(eq(notifications.id, id));
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(notifications)
      .set({ error: message.slice(0, 1000) })
      .where(eq(notifications.id, id));
    throw error;
  }
}

export async function markNotificationFailed(id: string, error: string): Promise<void> {
  await db
    .update(notifications)
    .set({ status: 'failed', error: error.slice(0, 1000) })
    .where(eq(notifications.id, id));
}

export async function sendTestNotification(recipient: string) {
  const email = testEmail(await getEmailBrand());
  const id = await createNotification({
    category: 'test',
    severity: 'info',
    recipient,
    subject: email.subject,
    html: email.html,
    textBody: email.text,
  });
  await deliverNotification(id).catch(async (error: unknown) => {
    await markNotificationFailed(id, error instanceof Error ? error.message : 'Unknown error');
  });
  const [row] = await db.select().from(notifications).where(eq(notifications.id, id));
  return row ?? null;
}

export async function retryNotification(id: string): Promise<boolean> {
  const [row] = await db
    .update(notifications)
    .set({ status: 'queued', error: null })
    .where(eq(notifications.id, id))
    .returning({ id: notifications.id });
  if (!row) return false;
  await enqueueJob(JOB_NOTIFICATION_DELIVER, { notificationId: id });
  return true;
}

export async function listNotifications(filters: {
  status?: string;
  page: number;
  pageSize: number;
}) {
  const conditions: SQL[] = [];
  if (filters.status) {
    conditions.push(
      eq(notifications.status, filters.status as typeof notifications.$inferSelect.status),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: notifications.id,
        category: notifications.category,
        severity: notifications.severity,
        recipient: notifications.recipient,
        subject: notifications.subject,
        status: notifications.status,
        provider: notifications.provider,
        error: notifications.error,
        attempts: notifications.attempts,
        securityEventId: notifications.securityEventId,
        createdAt: notifications.createdAt,
        sentAt: notifications.sentAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: sql<number>`count(*)::int` }).from(notifications).where(where),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}
