'use client';

import { useEffect, useState } from 'react';
import type { RecentTrack } from './types';

const POLL_MS = 20_000;

export function useLatestTrack(initial: RecentTrack | null = null): RecentTrack | null {
  const [track, setTrack] = useState(initial);
  const loadOnMount = initial === null;

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      const data = (await fetch('/api/music/now', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)) as { track: RecentTrack | null } | null;
      if (!cancelled && data?.track) setTrack(data.track);
    };

    if (loadOnMount) void refresh();
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadOnMount]);

  return track;
}
