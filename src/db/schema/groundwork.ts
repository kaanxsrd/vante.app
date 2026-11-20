import { groundworkTables } from '@vantedev/groundwork/schema';

/**
 * groundwork's tables, migrated with the rest of this schema. They are exported under `gw`
 * names because this app's older `api_keys` and `rate_limits` tables still exist while the
 * data moves over.
 */
export const { rateLimits: gwRateLimits, apiKeys: gwApiKeys } = groundworkTables();
