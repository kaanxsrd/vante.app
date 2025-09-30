import { docs, meta } from '@/.source';
import { DocsBody } from 'fumadocs-ui/page';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { TableOfContents } from '@/components/table-of-contents';
import { AuthorCard } from '@/components/author-card';
import { ReadMoreSection } from '@/components/read-more-section';
import { getAuthor, isValidAuthor } from '@/lib/authors';
import { FlickeringGrid } from '@/components/magicui/flickering-grid';
import { HashScrollHandler } from '@/components/hash-scroll-handler';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const blogSource = loader({
  baseUrl: '/blog',
  source: createMDXSource(docs, meta),
});

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default async function BlogPost({ params }: PageProps) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    notFound();
  }

  const page = blogSource.getPage([slug]);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const date = new Date(page.data.date);
  const formattedDate = formatDate(date);

  return (
    <div className="min-h-screen bg-background">
      <HashScrollHandler />
      <div className="relative w-full h-[180px] overflow-hidden">
        <FlickeringGrid
          className="absolute inset-0"
          squareSize={4}
          gridGap={6}
          color="#6B7280"
          maxOpacity={0.2}
          flickerChance={0.05}
        />
      </div>
      <div className="relative z-10 -mt-12 pb-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="rounded-2xl border border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 overflow-hidden">
              <div className="p-6 lg:p-10 space-y-6 border-b border-border/60">
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                  <Link
                    href="/blog"
                    aria-label="Back to all articles"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 transition-colors hover:bg-background"
                  >
                    <ArrowLeft className="size-4" />
                    <span className="sr-only">Back to all articles</span>
                  </Link>
                  {page.data.tags && page.data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-muted-foreground">
                      {page.data.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <time className="text-sm font-medium text-muted-foreground">{formattedDate}</time>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-balance">
                    {page.data.title}
                  </h1>
                  {page.data.description && (
                    <p className="text-muted-foreground text-base md:text-lg md:text-balance">
                      {page.data.description}
                    </p>
                  )}
                </div>
              </div>

              {page.data.thumbnail && (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted border-b border-border/60">
                  <Image
                    src={page.data.thumbnail}
                    alt={page.data.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              <div className="p-6 lg:p-10">
                <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:font-semibold prose-a:no-underline prose-headings:tracking-tight prose-headings:text-balance prose-p:tracking-tight prose-p:text-balance prose-lg">
                  <DocsBody>
                    <MDX />
                  </DocsBody>
                </div>
              </div>
            </main>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {page.data.author && isValidAuthor(page.data.author) && (
                  <div className="rounded-2xl border border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-6">
                    <AuthorCard author={getAuthor(page.data.author)} />
                  </div>
                )}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-6">
                  <TableOfContents />
                </div>
              </div>
            </aside>
          </div>

          <ReadMoreSection currentSlug={[slug]} currentTags={page.data.tags} />
        </div>
      </div>
    </div>
  );
}
