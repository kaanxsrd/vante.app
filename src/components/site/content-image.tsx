import Image from 'next/image';
import type { ComponentProps } from 'react';

export function ContentImage({ src, ...props }: ComponentProps<typeof Image> & { src: string }) {
  return <Image src={src} unoptimized={/^https?:\/\//i.test(src)} {...props} />;
}
