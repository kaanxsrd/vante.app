import Link from 'next/link';
import { FlickeringGrid } from '@/components/magicui/flickering-grid';
import { CopyText } from '@/components/site/copy-text';
import { Button } from '@/components/ui/button';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';

export default async function NotFound() {
  const copy = await getCopy();
  const pending = isCopyGroupBlank(copy, 'notFound');

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
          <CopyText text={copy['notFound.heading']} pending={pending} className="w-52" />
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed text-center tracking-tight text-balance">
          <CopyText text={copy['notFound.body']} pending={pending} className="w-64" />
        </p>
        <Button asChild className="w-full rounded-lg h-9 drop-shadow-lg">
          <Link href="/" aria-label={pending ? 'Home' : undefined}>
            <CopyText
              text={copy['notFound.button']}
              pending={pending}
              className="w-20 bg-background/30"
            />
          </Link>
        </Button>
      </div>
    </div>
  );
}
