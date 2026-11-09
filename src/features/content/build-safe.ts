import 'server-only';
import { logger } from '@/lib/logger';

export async function buildSafe<T>(fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      logger.warn('database unavailable during build, prerendering empty content', { error });
      return fallback;
    }
    throw error;
  }
}
