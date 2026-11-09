'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { isAnalyticsOptedOut } from '@/lib/analytics-consent';

interface PrivacyAwareNavigator extends Navigator {
  globalPrivacyControl?: boolean;
}

function browserOptedOut(): boolean {
  const nav = navigator as PrivacyAwareNavigator;
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || isAnalyticsOptedOut();
}

let isFirstView = true;

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (browserOptedOut()) return;

    const body = JSON.stringify({
      path: pathname,
      referrer: isFirstView ? document.referrer || null : window.location.origin,
    });
    isFirstView = false;

    const sent = navigator.sendBeacon?.(
      '/api/collect',
      new Blob([body], { type: 'application/json' }),
    );
    if (!sent) {
      void fetch('/api/collect', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  return null;
}
