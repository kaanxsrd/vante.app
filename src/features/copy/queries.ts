import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { buildSafe } from '@/features/content/build-safe';
import { getSetting } from '@/features/settings/service';
import type { SiteCopy } from './fields';
import { DEFAULT_COPY } from './schema';

export const COPY_CACHE_TAG = 'site-copy';

const loadCopy = unstable_cache(() => getSetting('copy'), [COPY_CACHE_TAG], {
  tags: [COPY_CACHE_TAG],
  revalidate: 300,
});

export const getCopy = cache(
  async (): Promise<SiteCopy> =>
    buildSafe(DEFAULT_COPY, () =>
      process.env.NODE_ENV === 'development' ? getSetting('copy') : loadCopy(),
    ),
);
