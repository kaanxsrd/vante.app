import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { isConnectionFailure, isMissingTable } from '@/db/errors';
import { settings } from '@/db/schema';

export type SetupStage = 'environment' | 'database' | 'migrations' | 'content' | 'ready';

export function setupStageFor(error: unknown): SetupStage | null {
  if (!process.env.DATABASE_URL) return 'environment';
  if (isConnectionFailure(error)) return 'database';
  if (isMissingTable(error)) return 'migrations';
  return null;
}

export async function getSetupStage(): Promise<SetupStage> {
  if (process.env.NODE_ENV !== 'development') return 'ready';

  try {
    const [profile] = await db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, 'profile'))
      .limit(1);
    return profile ? 'ready' : 'content';
  } catch (error) {
    const stage = setupStageFor(error);
    if (stage) return stage;
    throw error;
  }
}
