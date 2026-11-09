'use client';

import { useEffect, useState } from 'react';
import { linkToHeading } from '@/lib/scroll';
import { cn } from '@/lib/utils';

interface Heading {
  id: string;
  text: string;
}

const ACTIVE_LINE_PX = 100;
const SCROLL_THROTTLE_MS = 50;

function findActive(headings: Heading[]): string {
  let active = headings[0]?.id ?? '';
  for (const { id } of headings) {
    const top =
      document.getElementById(id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
    if (top <= ACTIVE_LINE_PX) active = id;
  }
  return active;
}

export function TableOfContents({ className, heading }: { className?: string; heading: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    setHeadings(
      Array.from(document.querySelectorAll('h1[id], h2[id]')).map((element) => ({
        id: element.id,
        text: element.textContent ?? '',
      })),
    );
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;
    let timer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActiveId(findActive(headings)), SCROLL_THROTTLE_MS);
    };
    setActiveId(findActive(headings));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="title mb-4 text-sm font-medium text-foreground">{heading}</h4>
      <nav aria-label="Table of contents">
        <ul className="space-y-0.5 border-l">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                type="button"
                onClick={() => void linkToHeading(heading.id)}
                aria-current={activeId === heading.id ? 'location' : undefined}
                className={cn(
                  '-ml-px block w-full border-l-2 border-transparent py-1 pl-3 text-left text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground',
                  activeId === heading.id && 'border-foreground font-medium text-foreground',
                )}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
