import { type ClassValue, clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stagger(index: number): CSSProperties {
  return { '--i': index } as CSSProperties;
}
