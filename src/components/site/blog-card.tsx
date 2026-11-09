import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BlogCardProps {
  url: string;
  title: string;
  description?: string;
  date: string;
  className?: string;
  linkClassName?: string;
}

export function BlogCard({
  url,
  title,
  description,
  date,
  className,
  linkClassName,
}: BlogCardProps) {
  return (
    <div className={cn('mb-4', className)}>
      <Link
        href={url}
        className={cn(
          'group relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border bg-primary-foreground/40 p-4 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-primary-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5',
          linkClassName,
        )}
      >
        <span aria-hidden="true" className="card-sheen" />
        <div className="relative min-w-0">
          <h2 className="title truncate text-lg font-medium">{title}</h2>
          {description && (
            <p className="prose line-clamp-2 text-pretty text-sm text-neutral-600 dark:prose-invert dark:text-neutral-400">
              {description}
            </p>
          )}
          <p className="mt-2 font-mono text-[11px] tracking-wide text-muted-foreground">{date}</p>
        </div>
        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border bg-background/60 transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>
    </div>
  );
}
