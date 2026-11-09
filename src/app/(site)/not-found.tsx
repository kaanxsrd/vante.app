import Link from 'next/link';
import { FlickeringGrid } from '@/components/magicui/flickering-grid';
import { Button } from '@/components/ui/button';
import { getCopy } from '@/features/copy/queries';

export default async function NotFound() {
  const copy = await getCopy();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center w-full z-10">
      <div className="absolute top-0 left-0 z-0 w-full h-[500px] [mask-image:linear-gradient(to_top,transparent_25%,black_95%)]">
        <FlickeringGrid
          className="absolute top-0 left-0 size-full"
          squareSize={4}
          gridGap={6}
          color="#6B7280"
          maxOpacity={0.5}
          flickerChance={0.1}
        />
      </div>
      <div className="text-center flex flex-col gap-4 max-w-xs mx-auto relative">
        <h1 className="bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text font-display text-8xl text-transparent drop-shadow-lg">
          {copy['notFound.heading']}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed text-center tracking-tight text-balance">
          {copy['notFound.body']}
        </p>
        <Button asChild className="w-full rounded-lg h-9 drop-shadow-lg">
          <Link href="/">{copy['notFound.button']}</Link>
        </Button>
      </div>
    </div>
  );
}
