import 'server-only';
import { db } from '@/db';
import { apiRequests } from '@/db/schema';
import { logger } from '@/lib/logger';

export type ApiOutcome = typeof apiRequests.$inferInsert.outcome;

export interface ApiRequestRecord {
  requestId: string;
  apiKeyId: string | null;
  keyPrefix: string | null;
  method: string;
  endpoint: string;
  path: string;
  statusCode: number;
  outcome: ApiOutcome;
  errorCode: string | null;
  durationMs: number;
  ip: string | null;
  country: string | null;
  origin: string | null;
  userAgent: string | null;
}

export function outcomeForStatus(status: number): ApiOutcome {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  if (status >= 400) return 'client_error';
  return 'success';
}

export async function recordApiRequest(record: ApiRequestRecord): Promise<void> {
  try {
    await db.insert(apiRequests).values(record);
  } catch (error) {
    logger.error('failed to record API request', { requestId: record.requestId, error });
  }
}
