'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { flushSync } from 'react-dom';

import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const toPolygonString = (points: Point[]) =>
  `polygon(${points
    .map((p) => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`)
    .join(', ')})`;

const polygonForSum = (sum: number, invert = false) => {
  const s = Math.max(0, Math.min(2, sum));
  let points: Point[];

  if (s <= 0) {
    points = [{ x: 0, y: 0 }];
  } else if (s < 1) {
    points = [
      { x: 0, y: 0 },
      { x: s, y: 0 },
      { x: 0, y: s },
    ];
  } else if (s < 2) {
    const over = s - 1;
    points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: over },
      { x: over, y: 1 },
      { x: 0, y: 1 },
    ];
  } else {
    points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  }

  const normalized = points.map((p) => ({ x: clamp(p.x), y: clamp(p.y) }));

  if (invert) {
    return toPolygonString(normalized.map((p) => ({ x: 1 - p.x, y: 1 - p.y })));
  }

  return toPolygonString(normalized);
};

type Props = {
  className?: string;
};

export const AnimatedThemeToggler = ({ className }: Props) => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    setIsDark(true);
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return;

    const newTheme = !isDark;

    const applyTheme = () => {
      flushSync(() => {
        setIsDark(newTheme);
        document.documentElement.classList.toggle('dark', newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      });
    };

    const startViewTransition = (
      document as unknown as {
        startViewTransition?: (callback: () => void) => ViewTransition;
      }
    ).startViewTransition;

    if (typeof startViewTransition !== 'function') {
      applyTheme();
      return;
    }

    const transition = startViewTransition.call(document, applyTheme);

    await transition.ready;

    const sums = [0.1, 0.32, 0.55, 0.78, 1.02, 1.35, 1.7, 2.1];
    const frames = sums;
    const color = newTheme ? '#050508' : '#ffffff';

    const keyframes = frames.map((sum, index) => ({
      clipPath: polygonForSum(sum, newTheme),
      backgroundColor: color,
      offset: frames.length === 1 ? 1 : index / (frames.length - 1),
    }));

    document.documentElement.animate(keyframes, {
      duration: 960,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
      pseudoElement: '::view-transition-new(root)',
    });
  }, [isDark]);

  if (!mounted) return null;
  return (
    <button ref={buttonRef} onClick={toggleTheme} className={cn(className)}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};
