'use client';

import { useInView } from 'motion/react';
import { type ReactNode, useRef } from 'react';

export function RevealGroup({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div ref={ref} data-reveal={inView ? 'shown' : 'pending'} className={className}>
      {children}
    </div>
  );
}
