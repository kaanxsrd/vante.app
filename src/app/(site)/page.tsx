import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { type CSSProperties, Fragment, type ReactNode } from 'react';
import { AppIcon, iconVars } from '@/components/app-icon';
import BlurFade from '@/components/magicui/blur-fade';
import { RevealGroup } from '@/components/magicui/reveal-group';
import { BlogCard } from '@/components/site/blog-card';
import { NowListening } from '@/components/site/now-listening';
import { ProjectCard } from '@/components/site/project-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPublishedPosts } from '@/features/blog/queries';
import { getCopy } from '@/features/copy/queries';
import { getSiteIcons } from '@/features/icons/queries';
import { getSiteProfile } from '@/features/profile/queries';
import { getHomeProjects } from '@/features/projects/queries';
import { formatDate } from '@/lib/format';
import { stagger } from '@/lib/utils';

export const revalidate = 300;

const EMPTY_STATE_CLASS = 'prose dark:prose-invert text-sm text-neutral-600 dark:text-neutral-400';

function SectionHeader({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="mb-4 flex justify-between">
      <h2 className="title text-xl font-medium">{title}</h2>
      <Link className="group link inline-flex w-fit items-center gap-0.5" href={href}>
        <span className="prose text-sm underline decoration-secondary-foreground/40 decoration-1 underline-offset-4 transition-all group-hover:decoration-secondary-foreground/70 dark:prose-invert">
          {label}
        </span>
        <ChevronRight className="size-4 text-primary/40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary/70" />
      </Link>
    </div>
  );
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id}>
      <BlurFade inView delay={0.08}>
        <div>{children}</div>
      </BlurFade>
    </section>
  );
}

function RevealedName({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
      {words.map((word, index) => (
        <Fragment key={index}>
          <span className="word-in" style={stagger(index)}>
            {word}
          </span>
          {index < words.length - 1 && ' '}
        </Fragment>
      ))}
    </h1>
  );
}

export default async function HomePage() {
  const [posts, projects, profile, copy] = await Promise.all([
    getPublishedPosts(),
    getHomeProjects(2),
    getSiteProfile(),
    getCopy(),
  ]);
  const icons = await getSiteIcons(profile.skills.map((skill) => skill.icon));
  const latestPosts = posts.slice(0, 2);

  return (
    <main className="relative mx-auto min-h-screen max-w-2xl bg-background px-6 py-12 font-sans antialiased sm:py-24">
      <div aria-hidden="true" className="hero-glow" />
      <div className="relative flex min-h-[100dvh] flex-col space-y-12">
        <section id="hero">
          <div className="mb-6 flex min-h-[88px] items-center justify-between gap-4">
            <div className="min-w-0">
              <RevealedName text={profile.name} />
              <span
                style={{ '--shiny-width': '100px' } as CSSProperties}
                className="mx-auto mt-1 block max-w-md animate-shiny-text bg-gradient-to-r from-transparent via-black/80 via-50% to-transparent bg-clip-text bg-no-repeat text-foreground/60 [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite] dark:via-white/80"
              >
                {profile.title}
              </span>
            </div>
            <div className="relative inline-block shrink-0">
              <div className="avatar-ring">
                <Avatar className="size-20 border-2 border-background">
                  <AvatarImage alt={profile.name} src={profile.avatar || undefined} />
                  <AvatarFallback>{profile.initials}</AvatarFallback>
                </Avatar>
              </div>
              <NowListening
                className="absolute right-0 bottom-0 translate-x-[1%] translate-y-[15%]"
                labels={{
                  nowPlaying: copy['music.nowPlaying'],
                  lastPlayed: copy['music.lastPlayed'],
                }}
              />
            </div>
          </div>
        </section>

        {(profile.intro || profile.about) && (
          <Section id="today">
            <h2 className="title mb-4 text-xl font-medium">{copy['home.todayHeading']}</h2>
            <div className="flex flex-col space-y-4">
              {[profile.intro, profile.about].filter(Boolean).map((paragraph) => (
                <p
                  key={paragraph}
                  className="prose inline text-pretty text-primary/80 dark:prose-invert dark:text-primary/60"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Section>
        )}

        {profile.skills.length > 0 && (
          <Section id="tech-stack">
            <h2 className="title mb-4 text-xl font-medium">{copy['home.techHeading']}</h2>
            <RevealGroup className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {profile.skills.map((skill, index) => {
                const data = icons[skill.icon];
                return (
                  <div
                    key={skill.name}
                    title={skill.name}
                    style={{ ...iconVars(data), ...stagger(index) }}
                    className="tech-tile flex h-12 w-full items-center gap-2.5 rounded-lg border bg-primary-foreground/40 px-3"
                  >
                    <AppIcon data={data} brand className="relative size-[18px] shrink-0" />
                    <span className="relative truncate text-[13px] font-medium text-foreground/85">
                      {skill.name}
                    </span>
                  </div>
                );
              })}
            </RevealGroup>
          </Section>
        )}

        <Section id="latest-blogs">
          <SectionHeader
            title={copy['home.blogsHeading']}
            href="/blog"
            label={copy['home.blogsLink']}
          />
          {latestPosts.length === 0 ? (
            <p className={EMPTY_STATE_CLASS}>{copy['home.blogsEmpty']}</p>
          ) : (
            <RevealGroup className="space-y-2.5">
              {latestPosts.map((post, index) => (
                <div key={post.slug} style={stagger(index)}>
                  <BlogCard
                    url={`/blog/${post.slug}`}
                    title={post.title}
                    description={post.description}
                    date={post.publishedAt ? formatDate(post.publishedAt) : ''}
                    className="mb-0"
                  />
                </div>
              ))}
            </RevealGroup>
          )}
        </Section>

        <Section id="projects">
          <SectionHeader
            title={copy['home.projectsHeading']}
            href="/projects"
            label={copy['home.projectsLink']}
          />
          {projects.length === 0 ? (
            <p className={EMPTY_STATE_CLASS}>{copy['home.projectsEmpty']}</p>
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((project, index) => (
                <div key={project.slug} style={stagger(index)}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </RevealGroup>
          )}
        </Section>

        <footer className="pb-16 text-center text-xs text-muted-foreground md:pb-4">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            {copy['home.privacyLink']}
          </Link>
        </footer>
      </div>
    </main>
  );
}
