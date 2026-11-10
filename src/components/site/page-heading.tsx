import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { CopyText } from '@/components/site/copy-text';

export function PageHeading({ title, pending = false }: { title: string; pending?: boolean }) {
  return (
    <div className="relative mb-8 flex items-center gap-3">
      <Link
        aria-label="Go back"
        href="/"
        className="group hidden rounded-full border border-secondary-foreground/20 bg-primary/5 p-1 shadow-xs transition-all duration-200 hover:bg-primary/10 md:flex md:items-center md:justify-center"
      >
        <ChevronLeft className="size-6 text-secondary-foreground/70 transition-colors duration-200 group-hover:text-secondary-foreground" />
      </Link>
      <h1 className="font-display text-3xl tracking-tight">
        <CopyText text={title} pending={pending} className="w-40" />
      </h1>
    </div>
  );
}
