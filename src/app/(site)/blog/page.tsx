import type { Metadata } from 'next';
import { RevealGroup } from '@/components/magicui/reveal-group';
import { BlogCard } from '@/components/site/blog-card';
import { CopyText } from '@/components/site/copy-text';
import { PageHeading } from '@/components/site/page-heading';
import { getPublishedPosts } from '@/features/blog/queries';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { stagger } from '@/lib/utils';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy['blog.metaTitle'], description: copy['blog.metaDescription'] };
}

export default async function BlogPage() {
  const [posts, copy] = await Promise.all([getPublishedPosts(), getCopy()]);
  const pending = isCopyGroupBlank(copy, 'blog');

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6 selection:bg-foreground/20 flex flex-col">
      <div className="flex-1">
        <section>
          <PageHeading title={copy['blog.heading']} pending={pending} />
          <RevealGroup className="space-y-4">
            {posts.length === 0 && (
              <p className="prose dark:prose-invert text-sm text-neutral-600 dark:text-neutral-400">
                <CopyText text={copy['blog.empty']} pending={pending} className="w-48" />
              </p>
            )}
            {posts.map((post, index) => (
              <div key={post.slug} style={stagger(index)}>
                <BlogCard
                  url={`/blog/${post.slug}`}
                  title={post.title}
                  date={
                    post.publishedAt
                      ? `${formatDate(post.publishedAt)} (${formatRelativeTime(post.publishedAt)})`
                      : ''
                  }
                />
              </div>
            ))}
          </RevealGroup>
        </section>
      </div>
    </div>
  );
}
