import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { buildSafe } from '@/features/content/build-safe';
import { getSetting } from '@/features/settings/service';
import { DEFAULT_PROFILE, type SiteProfile } from './schema';

export const PROFILE_CACHE_TAG = 'site-profile';

const loadProfile = unstable_cache(() => getSetting('profile'), [PROFILE_CACHE_TAG], {
  tags: [PROFILE_CACHE_TAG],
  revalidate: 300,
});

export const getSiteProfile = cache(
  async (): Promise<SiteProfile> => buildSafe(DEFAULT_PROFILE, () => loadProfile()),
);
