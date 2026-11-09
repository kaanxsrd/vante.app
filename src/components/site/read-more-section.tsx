import { BlogCard } from '@/components/site/blog-card';
import type { PublicPost } from '@/features/blog/queries';
import { formatDate, formatRelativeTime } from '@/lib/format';

export function ReadMoreSection({ posts, heading }: { posts: PublicPost[]; heading: string }) {
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-border p-0">
      <div className="p-6 lg:p-10">
        <h2 className="mb-8 text-2xl font-medium">{heading}</h2>
        <div className="flex flex-col">
          {posts.map((post) => (
            <BlogCard
              key={post.slug}
              url={`/blog/${post.slug}`}
              title={post.title}
              description={post.description}
              date={
                post.publishedAt
                  ? `${formatDate(post.publishedAt)} (${formatRelativeTime(post.publishedAt)})`
                  : ''
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
