'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const NUMBER = new Intl.NumberFormat('en-US');
const DURATION_S = 1.4;

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(0, value, {
      duration: DURATION_S,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (current) => {
        if (ref.current) ref.current.textContent = NUMBER.format(Math.round(current));
      },
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      {NUMBER.format(value)}
    </span>
  );
}
