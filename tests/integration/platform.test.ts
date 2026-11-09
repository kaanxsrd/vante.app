import './local-database';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDatabase, db } from '@/db';
import { apiKeys, auditLogs, jobs, notifications, rateLimits, securityEvents } from '@/db/schema';
import {
  createApiKey,
  findKeyBySecret,
  listApiKeys,
  rotateApiKey,
} from '@/features/api-keys/service';
import { enqueueJob, type JobHandler, processJobs } from '@/features/jobs/queue';
import { deliverNotification, queueSecurityNotification } from '@/features/notifications/service';
import { defaultRuleConfig } from '@/features/security/rules';
import { raiseSecurityEvent } from '@/features/security/service';
import { resetEnvCache } from '@/lib/env';
import { claimInterval, consumeRateLimit } from '@/lib/rate-limit';

const RUN = `t${Date.now()}`;

let resendResponses: Array<{ status: number; body: unknown }> = [];
let received: Array<Record<string, unknown>> = [];

const fakeResend = Bun.serve({
  port: 0,
  async fetch(request) {
    received.push((await request.json()) as Record<string, unknown>);
    const next = resendResponses.shift() ?? { status: 200, body: { id: 'msg_123' } };
    return Response.json(next.body, { status: next.status });
  },
});

beforeAll(async () => {
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.RESEND_BASE_URL = `http://localhost:${fakeResend.port}`;
  process.env.EMAIL_FROM = 'test <test@example.com>';
  process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'x'.repeat(48);
  process.env.SECURITY_ALERT_EMAIL = 'alerts@example.com';
  resetEnvCache();
});

beforeEach(() => {
  resendResponses = [];
  received = [];
});

afterAll(async () => {
  await db.delete(jobs).where(eq(jobs.type, `${RUN}:job`));

  const events = await db
    .select({ id: securityEvents.id })
    .from(securityEvents)
    .where(sql`${securityEvents.fingerprint} like ${`%${RUN}%`}`);
  if (events.length > 0) {
    const removed = await db
      .delete(notifications)
      .where(
        inArray(
          notifications.securityEventId,
          events.map((event) => event.id),
        ),
      )
      .returning({ id: notifications.id });
    if (removed.length > 0) {
      await db.delete(jobs).where(
        inArray(
          sql<string>`${jobs.payload}->>'notificationId'`,
          removed.map((row) => row.id),
        ),
      );
    }
  }
  await db.delete(auditLogs).where(eq(auditLogs.actor, 'test'));
  await db.delete(securityEvents).where(sql`${securityEvents.fingerprint} like ${`%${RUN}%`}`);
  await db.delete(rateLimits).where(sql`${rateLimits.key} like ${`%${RUN}%`}`);
  fakeResend.stop(true);
  await closeDatabase();
});

describe('consumeRateLimit', () => {
  test('counts up to the limit', async () => {
    const key = `${RUN}:basic`;
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push((await consumeRateLimit({ key, limit: 3, windowMs: 60_000 })).allowed);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  test('concurrent requests cannot exceed the limit', async () => {
    const key = `${RUN}:race`;
    const results = await Promise.all(
      Array.from({ length: 40 }, () => consumeRateLimit({ key, limit: 10, windowMs: 60_000 })),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(10);
  });

  test('the window resets', async () => {
    const key = `${RUN}:reset`;
    await consumeRateLimit({ key, limit: 1, windowMs: 40 });
    await Bun.sleep(80);
    expect((await consumeRateLimit({ key, limit: 1, windowMs: 40 })).allowed).toBe(true);
  });

  test('claimInterval fires once per interval', async () => {
    const name = `${RUN}:tick`;
    expect(await claimInterval(name, 60_000)).toBe(true);
    expect(await claimInterval(name, 60_000)).toBe(false);
  });
});

describe('API key rotation', () => {
  const policy = {
    name: `${RUN} rotation`,
    description: '',
    scopes: ['posts:read' as const],
    rateLimitPerMinute: 60,
    dailyQuota: null,
    allowedOrigins: [],
    allowedIps: [],
    expectedCountries: [],
    expiresAt: null,
  };

  test('the old secret works during the grace period only', async () => {
    const { record, key: original } = await createApiKey(policy, 'test');
    const rotated = await rotateApiKey(record.id, 1, 'test');
    if (!rotated) throw new Error('rotation failed');

    expect((await findKeyBySecret(original))?.id).toBe(record.id);
    expect((await findKeyBySecret(rotated.key))?.id).toBe(record.id);

    await db
      .update(apiKeys)
      .set({ previousKeyExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(apiKeys.id, record.id));
    expect(await findKeyBySecret(original)).toBeNull();
    expect((await findKeyBySecret(rotated.key))?.id).toBe(record.id);

    await db.delete(apiKeys).where(eq(apiKeys.id, record.id));
  });

  test('rotating without grace cuts the old secret off immediately', async () => {
    const { record, key: original } = await createApiKey(policy, 'test');
    await rotateApiKey(record.id, 0, 'test');
    expect(await findKeyBySecret(original)).toBeNull();
    await db.delete(apiKeys).where(eq(apiKeys.id, record.id));
  });

  test('dashboard reads never include the hash', async () => {
    const { record } = await createApiKey(policy, 'test');
    const listed = (await listApiKeys()).find((key) => key.id === record.id);
    expect(listed).toBeDefined();
    expect(Object.keys(listed ?? {})).not.toContain('keyHash');
    expect(Object.keys(listed ?? {})).not.toContain('previousKeyHash');
    expect(Object.keys(record)).not.toContain('keyHash');
    await db.delete(apiKeys).where(eq(apiKeys.id, record.id));
  });
});

describe('job queue', () => {
  const type = `${RUN}:job`;

  async function statusOf(marker: string) {
    const [row] = await db.select().from(jobs).where(sql`${jobs.payload}->>'marker' = ${marker}`);
    return row;
  }

  test('runs a job once', async () => {
    let runs = 0;
    const handlers: Record<string, JobHandler> = {
      [type]: {
        run: async () => {
          runs += 1;
        },
      },
    };
    await enqueueJob(type, { marker: 'once' });
    await processJobs(handlers);
    await processJobs(handlers);
    expect(runs).toBe(1);
    expect((await statusOf('once'))?.status).toBe('completed');
  });

  test('concurrent workers never run the same job twice', async () => {
    let runs = 0;
    const handlers: Record<string, JobHandler> = {
      [type]: {
        run: async ({ marker }) => {
          if (String(marker).startsWith('concurrent')) runs += 1;
          await Bun.sleep(5);
        },
      },
    };
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => enqueueJob(type, { marker: `concurrent-${i}` })),
    );
    await Promise.all(Array.from({ length: 4 }, () => processJobs(handlers, { limit: 12 })));
    expect(runs).toBe(12);
  });

  test('a failing job is retried later with backoff', async () => {
    const handlers: Record<string, JobHandler> = {
      [type]: {
        run: async () => {
          throw new Error('boom');
        },
      },
    };
    await enqueueJob(type, { marker: 'retry' }, { maxAttempts: 3 });
    await processJobs(handlers);
    const job = await statusOf('retry');
    expect(job?.status).toBe('pending');
    expect(job?.attempts).toBe(1);
    expect(job?.lastError).toBe('boom');
    expect(job?.runAt.getTime()).toBeGreaterThan(Date.now() + 20_000);
  });

  test('a job out of attempts fails and calls onExhausted once', async () => {
    let exhausted = 0;
    const handlers: Record<string, JobHandler> = {
      [type]: {
        run: async () => {
          throw new Error('still broken');
        },
        onExhausted: async () => {
          exhausted += 1;
        },
      },
    };
    await enqueueJob(type, { marker: 'dead' }, { maxAttempts: 1 });
    await processJobs(handlers);
    expect((await statusOf('dead'))?.status).toBe('failed');
    expect(exhausted).toBe(1);
  });
});

describe('security events and notifications', () => {
  const rule = { ...defaultRuleConfig('credential_abuse'), notify: true };
  const finding = (subject: string) => ({
    ruleId: 'credential_abuse' as const,
    subject: `${RUN}:${subject}`,
    summary: `Summary ${RUN}`,
    details: { distinctIps: 9 },
  });

  async function notificationFor(eventId: string) {
    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.securityEventId, eventId));
    return row;
  }

  test('repeats inside the cooldown merge into one incident and one email', async () => {
    const first = await raiseSecurityEvent(finding('dedupe'), rule);
    const second = await raiseSecurityEvent(finding('dedupe'), rule);
    expect(first?.created).toBe(true);
    expect(second?.created).toBe(false);
    expect(second?.id).toBe(first?.id ?? '');

    const [event] = await db
      .select()
      .from(securityEvents)
      .where(eq(securityEvents.id, first?.id ?? ''));
    expect(event?.occurrences).toBe(2);

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.securityEventId, first?.id ?? ''));
    expect(rows).toHaveLength(1);
  });

  test('a disabled rule records nothing', async () => {
    expect(await raiseSecurityEvent(finding('off'), { ...rule, enabled: false })).toBeNull();
  });

  test('delivery through Resend records the provider id', async () => {
    const event = await raiseSecurityEvent(finding('deliver'), rule);
    const notification = await notificationFor(event?.id ?? '');
    expect(notification?.status).toBe('queued');

    await deliverNotification(notification?.id ?? '');

    const sent = await notificationFor(event?.id ?? '');
    expect(sent?.status).toBe('sent');
    expect(sent?.provider).toBe('resend');
    expect(sent?.providerMessageId).toBe('msg_123');
    expect(received).toHaveLength(1);
    expect(received[0]?.to).toBe('alerts@example.com');
    expect(String(received[0]?.subject)).toContain('[CRITICAL]');
  });

  test('a provider rejection is recorded and thrown so the queue retries', async () => {
    const event = await raiseSecurityEvent(finding('reject'), rule);
    const notification = await notificationFor(event?.id ?? '');
    resendResponses = [
      { status: 422, body: { name: 'validation_error', message: 'Invalid from address' } },
    ];

    await expect(deliverNotification(notification?.id ?? '')).rejects.toThrow('Invalid from');

    const failed = await notificationFor(event?.id ?? '');
    expect(failed?.status).toBe('queued');
    expect(failed?.error).toContain('Invalid from');
    expect(failed?.attempts).toBe(1);
  });

  test('without a provider, the alert is skipped rather than retried forever', async () => {
    const event = await raiseSecurityEvent(finding('noprovider'), rule);
    const notification = await notificationFor(event?.id ?? '');
    const key = process.env.RESEND_API_KEY;
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    delete process.env.RESEND_API_KEY;
    process.env.SMTP_HOST = '';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    resetEnvCache();

    try {
      await deliverNotification(notification?.id ?? '');
    } finally {
      process.env.RESEND_API_KEY = key;
      process.env.SMTP_HOST = SMTP_HOST;
      process.env.SMTP_USER = SMTP_USER;
      process.env.SMTP_PASS = SMTP_PASS;
      resetEnvCache();
    }

    expect((await notificationFor(event?.id ?? ''))?.status).toBe('skipped');
  });

  test('an already-sent notification is not sent again', async () => {
    const event = await raiseSecurityEvent(finding('resend'), rule);
    const notification = await notificationFor(event?.id ?? '');
    await deliverNotification(notification?.id ?? '');
    await deliverNotification(notification?.id ?? '');
    expect(received).toHaveLength(1);
  });

  test('alerts stop at the hourly cap while incidents are still recorded', async () => {
    await db
      .insert(rateLimits)
      .values({ key: 'alerts:global', count: 1000, resetAt: new Date(Date.now() + 60_000) })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1000, resetAt: new Date(Date.now() + 60_000) },
      });
    const event = await raiseSecurityEvent(finding('capped'), rule);
    await db.delete(rateLimits).where(eq(rateLimits.key, 'alerts:global'));

    expect(event?.created).toBe(true);
    expect(await notificationFor(event?.id ?? '')).toBeUndefined();
  });

  test('a key that keeps tripping a rule is suspended again after it lapses', async () => {
    const suspendRule = {
      ...defaultRuleConfig('request_spike'),
      autoSuspend: true,
      suspendMinutes: 30,
      notify: false,
    };
    const { record } = await createApiKey(
      {
        name: `${RUN} suspend`,
        description: '',
        scopes: ['posts:read'],
        rateLimitPerMinute: 60,
        dailyQuota: null,
        allowedOrigins: [],
        allowedIps: [],
        expectedCountries: [],
        expiresAt: null,
      },
      'test',
    );
    const context = { apiKeyId: record.id };
    const spike = { ...finding('suspend'), ruleId: 'request_spike' as const };
    const suspendedUntil = async () =>
      (await db.select().from(apiKeys).where(eq(apiKeys.id, record.id)))[0]?.suspendedUntil;

    await raiseSecurityEvent(spike, suspendRule, context);
    const first = await suspendedUntil();
    expect(first).toBeInstanceOf(Date);

    await raiseSecurityEvent(spike, suspendRule, context);
    expect(await suspendedUntil()).toEqual(first);

    await db
      .update(apiKeys)
      .set({ suspendedUntil: new Date(Date.now() - 1000) })
      .where(eq(apiKeys.id, record.id));
    await raiseSecurityEvent(spike, suspendRule, context);
    expect((await suspendedUntil())?.getTime()).toBeGreaterThan(Date.now());

    await db.delete(securityEvents).where(eq(securityEvents.apiKeyId, record.id));
    await db.delete(apiKeys).where(eq(apiKeys.id, record.id));
  });

  test('queueSecurityNotification survives a bad event without throwing', async () => {
    const [event] = await db
      .select()
      .from(securityEvents)
      .where(sql`${securityEvents.fingerprint} like ${`%${RUN}%`}`)
      .limit(1);
    if (!event) throw new Error('expected a seeded event');
    await queueSecurityNotification({ ...event, ruleId: 'not_a_rule' });
  });
});
