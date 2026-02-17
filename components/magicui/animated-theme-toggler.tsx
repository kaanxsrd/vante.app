'use client';

import { type Variants, motion as m } from 'motion/react';
import { useTheme } from 'next-themes';
import { useCallback, useRef, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const toPolygonString = (points: { x: number; y: number }[]) =>
  `polygon(${points
    .map((p) => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`)
    .join(', ')})`;

const polygonForSum = (sum: number, invert = false) => {
  const s = Math.max(0, sum);
  let points: { x: number; y: number }[];

  if (s <= 0) {
    points = [{ x: 0, y: 0 }];
  } else if (s < 1) {
    points = [
      { x: 0, y: 0 },
      { x: s, y: 0 },
      { x: 0, y: s },
    ];
  } else {
    const over = s - 1;
    points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: over },
      { x: over, y: 1 },
      { x: 0, y: 1 },
    ];
  }

  const normalized = points;

  if (invert) {
    return toPolygonString(normalized.map((p) => ({ x: 1 - p.x, y: 1 - p.y })));
  }

  return toPolygonString(normalized);
};

export function AnimatedThemeToggler() {
  const [mounted, setMounted] = useState(false);
  const raysVariants = {
    hidden: {
      strokeOpacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
    visible: {
      strokeOpacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const rayVariant: Variants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
      scale: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        pathLength: { duration: 0.3 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.3 },
      },
    },
  };

  const shineVariant: Variants = {
    hidden: {
      opacity: 0,
      scale: 2,
      strokeDasharray: '20, 1000',
      strokeDashoffset: 0,
      filter: 'blur(0px)',
    },
    visible: {
      opacity: [0, 1, 0],
      strokeDashoffset: [0, -50, -100],
      filter: ['blur(2px)', 'blur(2px)', 'blur(0px)'],
      transition: {
        duration: 0.75,
        ease: 'linear',
      },
    },
  };

  const sunPath =
    'M70 49.5C70 60.8218 60.8218 70 49.5 70C38.1782 70 29 60.8218 29 49.5C29 38.1782 38.1782 29 49.5 29C60 29 69.5 38 70 49.5Z';
  const moonPath =
    'M70 49.5C70 60.8218 60.8218 70 49.5 70C38.1782 70 29 60.8218 29 49.5C29 38.1782 38.1782 29 49.5 29C39 45 49.5 59.5 70 49.5Z';

  const buttonRef = useRef<HTMLDivElement | null>(null);

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const switchTheme = useCallback(async () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";

    const applyTheme = () => {
      flushSync(() => {
        setTheme(newTheme);
      });
    };

    if (!document.startViewTransition) {
      applyTheme();
      return;
    }

    const transition = document.startViewTransition(applyTheme);

    await transition.ready;

    const sums = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];
    const frames = sums;
    const color = newTheme === "dark" ? '#050508' : '#ffffff';

    const keyframes = frames.map((sum, index) => ({
      clipPath: polygonForSum(sum, newTheme === "dark"),
      backgroundColor: color,
      offset: frames.length === 1 ? 1 : index / (frames.length - 1),
    }));

    document.documentElement.animate(keyframes, {
      duration: 960,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
      pseudoElement: '::view-transition-new(root)',
    });
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="size-5" />
      </div>
    );
  }

  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div
      ref={buttonRef}
      className="flex h-full w-full items-center justify-center cursor-pointer"
      onClick={switchTheme}
    >
      <m.svg
        strokeWidth="4"
        strokeLinecap="round"
        width={20}
        height={20}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        <m.path
          variants={shineVariant}
          d={moonPath}
          className="absolute top-0 left-0 stroke-blue-100"
          initial="hidden"
          animate={theme === 'dark' ? 'visible' : 'hidden'}
        />

        <m.g
          variants={raysVariants}
          initial="hidden"
          animate={theme === 'dark' ? 'hidden' : 'visible'}
          className="stroke-6 stroke-yellow-600 "
          style={{ strokeLinecap: 'round' }}
        >
          <m.path
            className="origin-center"
            variants={rayVariant}
            d="M50 2V11"
          />
          <m.path variants={rayVariant} d="M85 15L78 22" />
          <m.path variants={rayVariant} d="M98 50H89" />
          <m.path variants={rayVariant} d="M85 85L78 78" />
          <m.path variants={rayVariant} d="M50 98V89" />
          <m.path variants={rayVariant} d="M23 78L16 84" />
          <m.path variants={rayVariant} d="M11 50H2" />
          <m.path variants={rayVariant} d="M23 23L16 16" />
        </m.g>

        <m.path
          d={sunPath}
          fill="transparent"
          transition={{ duration: 1, type: 'spring' }}
          initial={{ fillOpacity: 0, strokeOpacity: 0 }}
          animate={
            theme === 'dark'
              ? {
                d: moonPath,
                rotate: -360,
                scale: 2,
                stroke: 'white',
                fill: 'white',
                fillOpacity: 0.35,
                strokeOpacity: 1,
                transition: { delay: 0.1 },
              }
              : {
                d: sunPath,
                rotate: 0,
                stroke: 'orange',
                fill: 'orange',
                fillOpacity: 0.35,
                strokeOpacity: 1,
              }
          }
        />
      </m.svg>
    </div>
  );
}
