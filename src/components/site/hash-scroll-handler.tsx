'use client';

import { useEffect } from 'react';
import { scrollToHeading } from '@/lib/scroll';

const INITIAL_SCROLL_DELAY_MS = 100;

export function HashScrollHandler() {
  useEffect(() => {
    const scrollToHash = () => {
      if (window.location.hash) scrollToHeading(window.location.hash.slice(1));
    };
    const timer = window.setTimeout(scrollToHash, INITIAL_SCROLL_DELAY_MS);
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);

  return null;
}
