import React from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BlurFade from '@/components/magicui/blur-fade';
import { SpotifyNowPlaying } from '@/components/spotify-now-playing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardBody, CardContainer } from '@/components/magicui/tilt-card';
import { BlogCard } from '@/components/blog-card';
import { siteConfig } from '@/lib/site';
import { getAllProjects } from '@/lib/projects';
import { docs, meta } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';

const BLUR_FADE_DELAY = 0.4;

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

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export default async function HomePage() {
  const allPages = blogSource.getPages() as BlogPage[];
  const latestBlogs = [...allPages]
    .sort((a, b) => {
      const dateA = new Date(a.data.date).getTime();
      const dateB = new Date(b.data.date).getTime();
      return dateB - dateA;
    })
    .slice(0, 2);

  const allProjects = getAllProjects();
  const latestProjects = allProjects.slice(0, 2);
  return (
    <main className="min-h-screen bg-background font-sans antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6">
      <div className="flex flex-col min-h-[100dvh] space-y-10">
        <section id="hero">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <div className="flex justify-between items-center mb-8 h-[72px]">
              <div>
                <h1 className="title font-medium text-2xl tracking-tight">{siteConfig.name}</h1>
                <span
                  style={{ '--shiny-width': '100px' } as React.CSSProperties}
                  className="mx-auto max-w-md text-foreground/60 animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite] bg-gradient-to-r from-transparent via-black/80 via-50% to-transparent dark:via-white/80"
                >
                  {siteConfig.title}
                </span>
              </div>
              <div className="relative inline-block">
                <Avatar className="size-20">
                  <AvatarImage alt={siteConfig.name} src={siteConfig.avatarUrl} />
                  <AvatarFallback>{siteConfig.initials}</AvatarFallback>
                </Avatar>
                <SpotifyNowPlaying className="absolute bottom-0 right-0 translate-x-[1%] translate-y-[15%]" />
              </div>
            </div>
          </BlurFade>
        </section>

        <section id="today">
          <BlurFade delay={BLUR_FADE_DELAY * 2}>
            <div>
              <h2 className="title font-medium text-lg mb-4">Today</h2>
              <div className="flex flex-col space-y-4">
                <p className="prose dark:prose-invert text-pretty inline dark:text-primary/50 text-primary/80">
                  {siteConfig.landing.intro}
                </p>
                <p className="prose dark:prose-invert text-pretty inline dark:text-primary/50 text-primary/80">
                  {siteConfig.landing.about}
                </p>
              </div>
            </div>
          </BlurFade>
        </section>

        <section id="tech-stack">
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <div>
              <h2 className="title font-medium text-lg mb-4">Tech Stack</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2.5 justify-items-stretch">
                {siteConfig.skills.map((skill, index) => {
                  const Icon = skill.icon;
                  return (
                    <div
                      key={index}
                      title={skill.name}
                      className="group relative flex h-11 w-full items-center gap-2.5 rounded-sm bg-primary-foreground/40 px-3 text-sm font-medium border dark:border-transparent transition-colors duration-200 hover:bg-primary-foreground/50"
                    >
                      <span className="flex h-4 w-4 items-center justify-center text-foreground/90 transition-colors group-hover:text-foreground dark:text-white/90 dark:group-hover:text-white">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                      </span>
                      <span className="truncate text-xs font-medium text-foreground/80 transition-colors group-hover:text-foreground dark:text-white/80 dark:group-hover:text-white">
                        {skill.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </BlurFade>
        </section>

        <section id="latest-blogs">
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <div>
              <div className="flex justify-between mb-4">
                <h2 className="title font-medium text-lg">Latest Blogs</h2>
                <div className="flex items-center">
                  <Link className="link inline-flex gap-1 w-fit" href="/blog">
                    <div className="prose dark:prose-invert underline underline-offset-4 decoration-1 decoration-secondary-foreground/40 hover:decoration-secondary-foreground/70 transition-all">
                      view more blogs
                    </div>
                  </Link>
                  <ChevronRight className="size-5 text-primary/40" />
                </div>
              </div>
              <div className="space-y-2">
                {latestBlogs.length === 0 ? (
                  <p className="prose dark:prose-invert text-sm text-neutral-600 dark:text-neutral-400">
                    No blogs published yet.
                  </p>
                ) : (
                  latestBlogs.map((blog) => (
                    <BlogCard
                      key={blog.url}
                      url={blog.url}
                      title={blog.data.title}
                      description={blog.data.description}
                      date={formatDate(blog.data.date)}
                      showRightBorder={false}
                      className="last:mb-0"
                      linkClassName="transform transition-transform duration-300 hover:scale-[1.02]"
                    />
                  ))
                )}
              </div>
            </div>
          </BlurFade>
        </section>

        <section id="projects">
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <div>
              <div className="flex justify-between mb-4">
                <h2 className="title font-medium text-lg">Projects</h2>
                <div className="flex items-center">
                  <Link className="link inline-flex gap-1 w-fit" href="/projects">
                    <div className="prose dark:prose-invert underline underline-offset-4 decoration-1 decoration-secondary-foreground/40 hover:decoration-secondary-foreground/70 transition-all">
                      view all projects
                    </div>
                  </Link>
                  <ChevronRight className="size-5 text-primary/40" />
                </div>
              </div>
              <div className="space-y-8">
                {latestProjects.length === 0 ? (
                  <p className="prose dark:prose-invert text-sm text-neutral-600 dark:text-neutral-400">
                    No projects added yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {latestProjects.map((project) => (
                      <CardContainer
                        key={project.url}
                        containerClassName="w-full"
                        className="w-full"
                      >
                        <CardBody className="w-full">
                          <div tabIndex={0}>
                            <a
                              className="block w-full overflow-hidden rounded-lg border bg-primary-foreground/50 transition-all duration-200 ease-in hover:opacity-90 hover:scale-[1.01]"
                              href={project.url}
                            >
                              <div className="relative aspect-[4/3] w-full">
                                <Image
                                  src={project.data.thumbnail}
                                  alt={project.data.title}
                                  fill
                                  className="object-cover"
                                  sizes="(min-width: 768px) 50vw, 100vw"
                                />
                              </div>
                              <div className="px-4 py-3">
                                <h2 className="title font-medium mt-1 text-md">
                                  {project.data.title}
                                </h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                  {project.data.type}
                                </p>
                              </div>
                            </a>
                          </div>
                        </CardBody>
                      </CardContainer>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </BlurFade>
        </section>
        <div className="h-4 md:hidden w-full" aria-hidden="true" />
      </div>
    </main>
  );
}
