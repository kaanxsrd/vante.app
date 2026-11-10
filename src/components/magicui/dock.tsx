'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { type MotionValue, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import React, { type PropsWithChildren, useEffect, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  magnification?: number;
  distance?: number;
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva('mx-auto w-max max-w-full h-full p-2 flex items-end rounded-full border');

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      magnification = DEFAULT_MAGNIFICATION,
      distance = DEFAULT_DISTANCE,
      ...props
    },
    ref,
  ) => {
    const mousex = useMotionValue(Infinity);
    const dockRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => dockRef.current as HTMLDivElement);

    useEffect(() => {
      const trackPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        const bounds = dockRef.current?.getBoundingClientRect();
        const inside =
          bounds &&
          e.clientX >= bounds.left &&
          e.clientX <= bounds.right &&
          e.clientY >= bounds.top &&
          e.clientY <= bounds.bottom;
        mousex.set(inside ? e.pageX : Infinity);
      };
      const clearPointer = () => mousex.set(Infinity);
      const root = document.documentElement;

      window.addEventListener('pointermove', trackPointer);
      root.addEventListener('pointerleave', clearPointer);
      return () => {
        window.removeEventListener('pointermove', trackPointer);
        root.removeEventListener('pointerleave', clearPointer);
      };
    }, [mousex]);

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            mousex,
            magnification,
            distance,
          } as DockIconProps);
        }
        return child;
      });
    };

    return (
      <motion.div ref={dockRef} {...props} className={cn(dockVariants({ className }))}>
        {renderChildren()}
      </motion.div>
    );
  },
);

Dock.displayName = 'Dock';

interface DockIconProps {
  size?: number;
  magnification?: number;
  distance?: number;
  mousex?: MotionValue<number>;
  className?: string;
  children?: React.ReactNode;
  props?: PropsWithChildren;
}

const DockIcon = ({
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mousex,
  className,
  children,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const fallbackMouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const distanceCalc = useTransform(mousex ?? fallbackMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distanceCalc, [-distance, 0, distance], [40, magnification, 40]);

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className={cn(
        'flex aspect-square min-w-0 cursor-pointer items-center justify-center rounded-full',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

DockIcon.displayName = 'DockIcon';

export { Dock, DockIcon };
