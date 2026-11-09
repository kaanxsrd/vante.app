import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { logger } from '@/lib/logger';
import { SETTINGS_DEFAULTS, SETTINGS_SCHEMAS, type SettingsMap } from './schema';

export async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return SETTINGS_DEFAULTS[key];

  const defaults = SETTINGS_DEFAULTS[key] as Record<string, unknown>;
  const stored = row.value as Record<string, unknown>;
  const merged = { ...defaults, ...stored };
  const parsed = SETTINGS_SCHEMAS[key].safeParse(merged);
  if (!parsed.success) {
    logger.warn('stored setting is invalid, using defaults', { key });
    return SETTINGS_DEFAULTS[key];
  }
  return parsed.data as SettingsMap[K];
}

export async function saveSetting<K extends keyof SettingsMap>(
  key: K,
  value: SettingsMap[K],
): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}
