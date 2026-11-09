'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/format';

const TICK_MS = 60_000;

export function TimeAgo({
  at,
  renderedAt,
  className,
}: {
  at: number;
  renderedAt: number;
  className?: string;
}) {
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <time dateTime={new Date(at).toISOString()} className={className}>
      {formatRelativeTime(new Date(at), new Date(now))}
    </time>
  );
}
