'use client';

import { Link } from 'lucide-react';
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { linkToHeading } from '@/lib/scroll';
import { cn } from '@/lib/utils';

interface CopyHeaderProps extends HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

export function CopyHeader({ level, children, className, id, ...props }: CopyHeaderProps) {
  const Heading = `h${level}` as const;

  if (level > 2 || !id) {
    return (
      <Heading id={id} className={cn('scroll-mt-20', className)} {...props}>
        {children}
      </Heading>
    );
  }

  const copy = () => void linkToHeading(id);

  return (
    <Heading
      id={id}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex scroll-mt-20 cursor-pointer items-center gap-2 transition-colors duration-200 hover:text-muted-foreground',
        className,
      )}
      onClick={copy}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Enter') copy();
      }}
      title="Click to copy link to this section"
      {...props}
    >
      {children}
      <Link className="h-4 w-4 flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </Heading>
  );
}
