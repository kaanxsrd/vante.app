'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SiteError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="mx-auto flex max-w-xs flex-col gap-4 text-center">
        <h1 className="font-medium text-2xl tracking-tight">Something went wrong</h1>
        <p className="text-balance text-muted-foreground text-sm leading-relaxed">
          This page could not be loaded. Please try again in a moment.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={reset}>
            Try again
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
