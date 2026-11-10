import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CopyText({
  text,
  pending,
  className,
}: {
  text: string;
  pending: boolean;
  className?: string;
}) {
  if (text || !pending) return text;

  return (
    <Skeleton asChild className={cn('inline-block h-[0.9em] w-24 align-middle', className)}>
      <span aria-hidden="true" />
    </Skeleton>
  );
}
