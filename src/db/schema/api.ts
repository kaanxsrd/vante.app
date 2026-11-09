import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    prefix: text('prefix').notNull().unique(),
    keyHash: text('key_hash').notNull().unique(),
    previousKeyHash: text('previous_key_hash'),
    previousKeyExpiresAt: timestamp('previous_key_expires_at', { withTimezone: true }),
    scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
    rateLimitPerMinute: integer('rate_limit_per_minute').notNull().default(60),
    dailyQuota: integer('daily_quota'),
    allowedOrigins: text('allowed_origins').array().notNull().default(sql`'{}'::text[]`),
    allowedIps: text('allowed_ips').array().notNull().default(sql`'{}'::text[]`),
    expectedCountries: text('expected_countries').array().notNull().default(sql`'{}'::text[]`),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    suspendedReason: text('suspended_reason'),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastUsedIp: text('last_used_ip'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('api_keys_previous_key_hash_idx').on(t.previousKeyHash),
    index('api_keys_created_at_idx').on(t.createdAt.desc()),
  ],
);

export const apiRequestOutcome = pgEnum('api_request_outcome', [
  'success',
  'client_error',
  'server_error',
  'unauthorized',
  'forbidden',
  'rate_limited',
]);

export const apiRequests = pgTable(
  'api_requests',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    requestId: uuid('request_id').notNull(),
    apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    keyPrefix: text('key_prefix'),
    method: text('method').notNull(),
    endpoint: text('endpoint').notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code').notNull(),
    outcome: apiRequestOutcome('outcome').notNull(),
    errorCode: text('error_code'),
    durationMs: integer('duration_ms').notNull(),
    ip: text('ip'),
    country: text('country'),
    origin: text('origin'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('api_requests_created_at_idx').on(t.createdAt.desc()),
    index('api_requests_key_created_idx').on(t.apiKeyId, t.createdAt.desc()),
    index('api_requests_endpoint_created_idx').on(t.endpoint, t.createdAt.desc()),
    index('api_requests_ip_created_idx').on(t.ip, t.createdAt.desc()),
    index('api_requests_outcome_created_idx').on(t.outcome, t.createdAt.desc()),
  ],
);
