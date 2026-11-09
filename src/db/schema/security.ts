import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { apiKeys } from './api';

export const securitySeverity = pgEnum('security_severity', [
  'info',
  'low',
  'medium',
  'high',
  'critical',
]);

export const securityClassification = pgEnum('security_classification', [
  'anomaly',
  'policy_violation',
  'suspected_threat',
  'service_failure',
  'confirmed_threat',
]);

export const securityEventStatus = pgEnum('security_event_status', [
  'open',
  'acknowledged',
  'resolved',
  'false_positive',
]);

export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ruleId: text('rule_id').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    severity: securitySeverity('severity').notNull(),
    classification: securityClassification('classification').notNull(),
    status: securityEventStatus('status').notNull().default('open'),
    fingerprint: text('fingerprint').notNull(),
    occurrences: integer('occurrences').notNull().default(1),
    apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    keyPrefix: text('key_prefix'),
    endpoint: text('endpoint'),
    method: text('method'),
    ip: text('ip'),
    country: text('country'),
    origin: text('origin'),
    userAgent: text('user_agent'),
    statusCode: integer('status_code'),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    actionTaken: text('action_taken'),
    resolutionNote: text('resolution_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('security_events_last_seen_idx').on(t.lastSeenAt.desc()),
    index('security_events_fingerprint_idx').on(t.fingerprint, t.lastSeenAt.desc()),
    index('security_events_severity_idx').on(t.severity, t.lastSeenAt.desc()),
    index('security_events_status_idx').on(t.status, t.lastSeenAt.desc()),
    index('security_events_api_key_idx').on(t.apiKeyId, t.lastSeenAt.desc()),
  ],
);

export const securityRules = pgTable('security_rules', {
  ruleId: text('rule_id').primaryKey(),
  enabled: boolean('enabled').notNull(),
  severity: securitySeverity('severity').notNull(),
  threshold: integer('threshold').notNull(),
  windowSeconds: integer('window_seconds').notNull(),
  cooldownSeconds: integer('cooldown_seconds').notNull(),
  notify: boolean('notify').notNull(),
  autoSuspend: boolean('auto_suspend').notNull().default(false),
  suspendMinutes: integer('suspend_minutes').notNull().default(60),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ipRuleAction = pgEnum('ip_rule_action', ['watch', 'block']);

export const ipRules = pgTable(
  'ip_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ip: text('ip').notNull().unique(),
    action: ipRuleAction('action').notNull(),
    reason: text('reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ip_rules_action_idx').on(t.action)],
);

export const authAttempts = pgTable(
  'auth_attempts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    identifier: text('identifier').notNull(),
    success: boolean('success').notNull(),
    reason: text('reason'),
    ip: text('ip'),
    country: text('country'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('auth_attempts_created_idx').on(t.createdAt.desc()),
    index('auth_attempts_ip_created_idx').on(t.ip, t.createdAt.desc()),
  ],
);

export type SecurityEventRow = typeof securityEvents.$inferSelect;
