import { groundworkTables } from '@vantedev/groundwork/schema';

/**
 * groundwork's tables, migrated with the rest of this schema. They are exported under `gw`
 * names because this app's older `api_keys`, `rate_limits` and `audit_logs` tables still exist while the
 * data moves over.
 */
export const {
  rateLimits: gwRateLimits,
  apiKeys: gwApiKeys,
  auditLog: gwAuditLog,
} = groundworkTables();
