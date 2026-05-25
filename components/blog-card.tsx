import Link from 'next/link';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogCardProps {
  url: string;
  title: string;
  description: string;
  date: string;
  showRightBorder?: boolean;
  className?: string;
  linkClassName?: string;
}

export function BlogCard({
  url,
  title,
  description,
  date,
  showRightBorder = true,
  className,
  linkClassName,
}: BlogCardProps) {
  return (
    <div className={cn('mb-4', className)}>
      <div tabIndex={0}>
        <Link
          href={url}
          className={cn(
            'group bg-primary-foreground/40 rounded-sm sm:p-5 flex items-center p-4 gap-4 justify-between border transition-colors duration-200 hover:bg-primary-foreground/50 focus:outline-none',
            showRightBorder && 'md:border-r border-border border-b-0',
            linkClassName,
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <h2 className="title text-lg font-medium truncate">{title}</h2>
              <p className="prose dark:prose-invert text-pretty text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                {description}
              </p>
              <p className="text-muted-foreground text-xs mt-1">{date}</p>
            </div>
          </div>
          <div className="transition-transform group-hover:-rotate-45 group-hover:-translate-y-1 rounded-full flex justify-center items-center h-10 w-10">
            <ArrowUp className="rotate-45 size-5 text-primary" />
          </div>
        </Link>
      </div>
    </div>
  );
}
