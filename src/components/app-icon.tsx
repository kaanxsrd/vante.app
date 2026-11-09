import type { CSSProperties } from 'react';
import type { IconData } from '@/features/icons/types';
import { cn } from '@/lib/utils';

export function iconVars(data: IconData | undefined): CSSProperties {
  return { '--icon-light': data?.light, '--icon-dark': data?.dark } as CSSProperties;
}

interface AppIconProps {
  data: IconData | undefined;
  brand?: boolean;
  className?: string;
}

export function AppIcon({ data, brand = false, className }: AppIconProps) {
  const classes = cn(brand && 'icon-brand', className);

  if (!data) {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={classes}>
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={data.viewBox}
      className={classes}
      dangerouslySetInnerHTML={{ __html: data.body }}
    />
  );
}
