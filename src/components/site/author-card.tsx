import { ContentImage } from '@/components/site/content-image';
import type { Author } from '@/features/authors/queries';
import { cn } from '@/lib/utils';

interface AuthorCardProps {
  author: Pick<Author, 'name' | 'position' | 'avatar'>;
  className?: string;
}

export function AuthorCard({ author, className }: AuthorCardProps) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      {author.avatar && (
        <ContentImage
          src={author.avatar}
          alt={author.name}
          width={32}
          height={32}
          className="rounded-full w-8 h-8 border border-border object-cover"
        />
      )}
      <div className="flex-1">
        <h3 className="text-sm tracking-tight text-balance font-semibold">{author.name}</h3>
        <p className="text-xs text-muted-foreground text-balance">{author.position}</p>
      </div>
    </div>
  );
}
