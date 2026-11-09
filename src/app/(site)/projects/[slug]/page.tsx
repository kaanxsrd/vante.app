import { DocsBody } from 'fumadocs-ui/page';
import { ChevronLeft, Link2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentImage } from '@/components/site/content-image';
import { Markdown } from '@/features/content/markdown';
import { getCopy } from '@/features/copy/queries';
import { getSiteProfile } from '@/features/profile/queries';
import {
  getPublishedProject,
  getPublishedProjects,
  projectLinks,
} from '@/features/projects/queries';
import { siteUrl } from '@/lib/env';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [project, profile, copy] = await Promise.all([
    getPublishedProject(slug),
    getSiteProfile(),
    getCopy(),
  ]);
  if (!project) return { title: copy['notFound.heading'] };

  const url = `${siteUrl()}/projects/${slug}`;
  const title = project.seoTitle ?? project.title;
  const description = project.seoDescription ?? project.description;
  const image = project.ogImage ?? project.thumbnail ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: profile.siteName || profile.name,
      ...(image ? { images: [{ url: image, alt: project.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const [project, copy] = await Promise.all([getPublishedProject(slug), getCopy()]);
  if (!project) notFound();

  const techStack = Array.from(new Set([...project.frontend, ...project.backend]));
  const links = projectLinks(project);

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6 selection:bg-foreground/20 flex flex-col">
      <div className="flex-1">
        <div className="mb-6 relative">
          <Link
            aria-label="Back to projects"
            href="/projects"
            className="group absolute top-0 -left-[50px] z-50 hidden items-center justify-center rounded-full border border-secondary-foreground/20 bg-primary/5 p-1 shadow-xs transition-all duration-200 hover:bg-primary/10 md:flex"
          >
            <ChevronLeft className="size-6 text-secondary-foreground/70 group-hover:text-secondary-foreground transition-colors duration-200" />
          </Link>
          <div className="flex md:flex-row flex-col md:justify-between md:items-center">
            <h1 className="font-display text-3xl tracking-tight">{project.title}</h1>
            <p className="font-mono text-xs tracking-wide text-muted-foreground">
              {project.category}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col gap-4">
            {project.thumbnail && (
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-primary-foreground/50">
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-background/40 via-transparent to-background/60 pointer-events-none" />
                <div className="relative aspect-[4/3] w-full">
                  <ContentImage
                    src={project.thumbnail}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 768px) 50vw, 100vw"
                    loading="eager"
                  />
                </div>
              </div>
            )}
            {project.description && (
              <p className="prose dark:prose-invert text-pretty inline">{project.description}</p>
            )}
          </div>

          {techStack.length > 0 && (
            <div>
              <h2 className="title font-medium text-lg mb-4">
                {copy['projects.technologiesHeading']}
              </h2>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-block min-w-fit rounded-full border bg-primary-foreground/60 px-3.5 py-1.5 text-center text-xs font-medium text-primary transition-colors duration-200 hover:border-foreground/25 hover:bg-primary-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {links.map((link) => (
                <Link
                  key={link.name + link.href}
                  className="link inline-flex gap-1 w-fit items-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={link.href}
                >
                  <div className="linkIcon flex justify-center items-center transition-all">
                    <Link2 className="size-4" />
                  </div>
                  <div className="prose dark:prose-invert underline underline-offset-4 decoration-1 decoration-secondary-foreground/40 hover:decoration-secondary-foreground/70 transition-all">
                    {link.name}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {project.gallery.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {project.gallery.map((image, index) => (
                <div
                  key={image}
                  className="group relative aspect-video overflow-hidden rounded-lg border border-border/60"
                >
                  <ContentImage
                    src={image}
                    alt={`${project.title} screenshot ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(min-width: 640px) 50vw, 100vw"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none">
            <DocsBody>
              <Markdown content={project.content} />
            </DocsBody>
          </div>
        </div>
      </div>
    </div>
  );
}
