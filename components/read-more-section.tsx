// ...existing code...
import { docs, meta } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';
import Link from 'next/link';
import { ArrowUp } from 'lucide-react';

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

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  let diff = now.getTime() - date.getTime();

  const units = [
    { label: 'y', ms: 1000 * 60 * 60 * 24 * 365 },
    { label: 'mo', ms: 1000 * 60 * 60 * 24 * 30 },
    { label: 'w', ms: 1000 * 60 * 60 * 24 * 7 },
    { label: 'd', ms: 1000 * 60 * 60 * 24 },
    { label: 'h', ms: 1000 * 60 * 60 },
    { label: 'm', ms: 1000 * 60 },
  ];

  const isPast = diff >= 0;
  diff = Math.abs(diff);

  for (const unit of units) {
    const value = Math.floor(diff / unit.ms);
    if (value >= 1) {
      return isPast ? `${value}${unit.label} ago` : `in ${value}${unit.label}`;
    }
  }

  return 'Just now';
};

interface BlogData {
  title: string;
  description: string;
  date: string;
  tags?: string[];
  featured?: boolean;
  readTime?: string;
  author?: string;
  authorImage?: string;
  thumbnail?: string;
}

interface BlogPage {
  url: string;
  data: BlogData;
}

interface ReadMoreSectionProps {
  currentSlug: string[];
  currentTags?: string[];
}

export function ReadMoreSection({ currentSlug, currentTags = [] }: ReadMoreSectionProps) {
  const allPages = blogSource.getPages() as BlogPage[];

  const currentUrl = `/blog/${currentSlug.join('/')}`;

  const otherPosts = allPages
    .filter((page) => page.url !== currentUrl)
    .map((page) => {
      const tagOverlap = currentTags.filter((tag) => page.data.tags?.includes(tag)).length;

      return {
        ...page,
        relevanceScore: tagOverlap,
        date: new Date(page.data.date),
      };
    })
    .sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.date.getTime() - a.date.getTime();
    })
    .slice(0, 3);

  if (otherPosts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border p-0">
      <div className="p-6 lg:p-10">
        <h2 className="text-2xl font-medium mb-8">Read more</h2>

        <div className="flex flex-col gap-4">
          {otherPosts.map((post) => {
            const formattedDate = formatDate(post.date);
            const relativeTime = formatRelativeTime(post.date);
            const dateText = `${formattedDate} (${relativeTime})`;

            return (
              <Link
                key={post.url}
                href={post.url}
                className="group bg-primary-foreground/40 rounded-sm sm:p-5 flex items-center p-4 gap-4 justify-between border transition-colors duration-200 hover:bg-primary-foreground/50"
              >
                <div className="space-y-2 flex-1">
                  <h3 className="title text-lg font-medium">{post.data.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {post.data.description}
                  </p>
                  <time className="block text-xs font-medium text-muted-foreground">
                    {dateText}
                  </time>
                </div>
                <div className="transition-transform group-hover:-rotate-45 group-hover:-translate-y-1 rounded-full flex justify-center items-center h-10 w-10">
                  <ArrowUp className="rotate-45 size-5 text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
