import Link from 'next/link';
import { ArrowUp, ChevronLeft } from 'lucide-react';
import { docs, meta } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';

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

export default async function BlogPage() {
  const allPages = blogSource.getPages() as BlogPage[];
  const sortedBlogs = [...allPages].sort((a, b) => {
    const dateA = new Date(a.data.date).getTime();
    const dateB = new Date(b.data.date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6 selection:bg-foreground/20 flex flex-col __variable_1e4310 __variable_c3aa02">
      <div className="flex-1">
        <section>
          <div className="relative mb-8 flex items-center gap-3">
            <div className="hidden md:block" tabIndex={0}>
              <Link
                aria-label="Go back"
                role="button"
                href="/"
                className="group rounded-full flex items-center justify-center border border-secondary-foreground/20 bg-primary/5 hover:bg-primary/10 transition-all duration-200 shadow-xs p-1"
              >
                <ChevronLeft className="size-6 text-secondary-foreground/70 group-hover:text-secondary-foreground transition-colors duration-200" />
              </Link>
            </div>
            <h1 className="title font-medium text-2xl tracking-tight">Blogs</h1>
          </div>

          <div className="space-y-4">
            {sortedBlogs.length === 0 && (
              <p className="prose dark:prose-invert text-sm text-neutral-600 dark:text-neutral-400">
                No blogs published yet.
              </p>
            )}

            {sortedBlogs.map((blog) => {
              const date = new Date(blog.data.date);
              const formattedDate = formatDate(date);
              const relativeTime = formatRelativeTime(date);
              const dateText = `${formattedDate} (${relativeTime})`;

              return (
                <div key={blog.url} className="mb-4">
                  <div tabIndex={0}>
                    <Link
                      className="group bg-primary-foreground/40 rounded-sm sm:p-5 flex items-center p-4 gap-4 justify-between border transition-colors duration-300 hover:bg-primary-foreground/50 transform hover:scale-[1.02]"
                      href={blog.url}
                    >
                      <div>
                        <h2 className="title text-lg font-medium">{blog.data.title}</h2>
                        <p className="prose dark:prose-invert text-pretty inline text-sm text-neutral-600 dark:text-neutral-400">
                          {dateText}
                        </p>
                      </div>
                      <div className="transition-transform group-hover:-rotate-45 group-hover:-translate-y-1 rounded-full flex justify-center items-center h-10 w-10">
                        <ArrowUp className="rotate-45 size-5 text-primary" />
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
