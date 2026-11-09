import { displayPrefix } from '@/features/api-keys/crypto';
import { jsonData } from '@/features/api-platform/http';
import { apiRoute } from '@/features/api-platform/route';

export const runtime = 'nodejs';

export const GET = apiRoute({ endpoint: '/api/v1/me' }, async ({ key }) =>
  jsonData({
    id: key.id,
    name: key.name,
    prefix: displayPrefix(key.prefix),
    scopes: key.scopes,
    rateLimitPerMinute: key.rateLimitPerMinute,
    dailyQuota: key.dailyQuota,
    expiresAt: key.expiresAt,
  }),
);
