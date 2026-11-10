import { DocsBody } from 'fumadocs-ui/page';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FlickeringGrid } from '@/components/magicui/flickering-grid';
import { AuthorCard } from '@/components/site/author-card';
import { ContentImage } from '@/components/site/content-image';
import { CopyText } from '@/components/site/copy-text';
import { HashScrollHandler } from '@/components/site/hash-scroll-handler';
import { ReadingProgress } from '@/components/site/reading-progress';
import { TableOfContents } from '@/components/site/table-of-contents';
import { getAuthorBySlug } from '@/features/authors/queries';
import type { PublicPost } from '@/features/blog/queries';
import { Markdown } from '@/features/content/markdown';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';
import { formatDate } from '@/lib/format';

const PANEL_CLASS =
  'rounded-2xl border border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60';

export async function PostArticle({ post, footer }: { post: PublicPost; footer?: ReactNode }) {
  const [author, copy] = await Promise.all([
    post.author ? getAuthorBySlug(post.author) : null,
    getCopy(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <HashScrollHandler />
      <ReadingProgress />
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
            <main className={`${PANEL_CLASS} overflow-hidden`}>
              <div className="p-6 lg:p-10 space-y-6 border-b border-border/60">
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                  <Link
                    href="/blog"
                    aria-label="Back to all articles"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 transition-colors hover:bg-background"
                  >
                    <ArrowLeft className="size-4" />
                  </Link>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-muted-foreground">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {post.publishedAt && (
                    <time
                      dateTime={post.publishedAt.toISOString()}
                      className="font-mono text-xs tracking-wide text-muted-foreground"
                    >
                      {formatDate(post.publishedAt)}
                    </time>
                  )}
                </div>

                <div className="space-y-4">
                  <h1 className="font-display text-3xl tracking-tight text-balance md:text-4xl lg:text-5xl">
                    {post.title}
                  </h1>
                  {post.description && (
                    <p className="text-muted-foreground text-base md:text-lg md:text-balance">
                      {post.description}
                    </p>
                  )}
                </div>
              </div>

              {post.thumbnail && (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted border-b border-border/60">
                  <ContentImage
                    src={post.thumbnail}
                    alt={post.title}
                    fill
                    className="object-cover"
                    loading="eager"
                    sizes="(min-width: 1024px) 66vw, 100vw"
                  />
                </div>
              )}

              <div className="p-6 lg:p-10">
                <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:font-semibold prose-a:no-underline prose-headings:tracking-tight prose-headings:text-balance prose-p:tracking-tight prose-p:text-balance prose-lg">
                  <DocsBody>
                    <Markdown content={post.content} />
                  </DocsBody>
                </div>
              </div>
            </main>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {author && (
                  <div className={`${PANEL_CLASS} p-6`}>
                    <AuthorCard author={author} />
                  </div>
                )}
                <div className={`${PANEL_CLASS} p-6`}>
                  <TableOfContents
                    heading={
                      <CopyText
                        text={copy['blog.tocHeading']}
                        pending={isCopyGroupBlank(copy, 'blog')}
                      />
                    }
                  />
                </div>
              </div>
            </aside>
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}
