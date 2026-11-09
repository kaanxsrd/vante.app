import { ContentImage } from '@/components/site/content-image';
import { cn } from '@/lib/utils';

export function CoverArt({
  src,
  name,
  sizes,
  className,
  imageClassName,
  eager = false,
}: {
  src: string | null;
  name: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  eager?: boolean;
}) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden bg-muted', className)}>
      {src ? (
        <ContentImage
          src={src}
          alt=""
          fill
          sizes={sizes}
          loading={eager ? 'eager' : undefined}
          className={cn('object-cover', imageClassName)}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-display text-muted-foreground"
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
