import 'server-only';
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';
import { resolveIcons } from './catalog';
import type { IconMap } from './types';

const loadIcons = unstable_cache(async (ids: string[]) => resolveIcons(ids), ['site-icons'], {
  revalidate: false,
});

export async function getSiteIcons(ids: string[]): Promise<IconMap> {
  try {
    return await loadIcons([...new Set(ids)].sort());
  } catch (error) {
    logger.warn('site icons unavailable', { error });
    return {};
  }
}
