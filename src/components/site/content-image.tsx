'use client';

import Image from 'next/image';
import { type ComponentProps, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ContentImage({
  src,
  className,
  ...props
}: ComponentProps<typeof Image> & { src: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <Skeleton
        aria-hidden="true"
        className={cn(className, props.fill && 'absolute inset-0 size-full rounded-none')}
      />
    );
  }

  return (
    <Image
      src={src}
      unoptimized={/^https?:\/\//i.test(src)}
      className={className}
      onError={() => setFailedSrc(src)}
      {...props}
    />
  );
}
