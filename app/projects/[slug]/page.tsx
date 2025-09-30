import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Link2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DocsBody } from 'fumadocs-ui/page';

import { getProjectBySlug } from '@/lib/projects';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const TechPill = ({ label }: { label: string }) => (
  <span className="inline-block text-sm py-2 px-4 italic rounded-lg bg-primary-foreground/80 text-primary min-w-fit text-center">
    {label}
  </span>
);

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    notFound();
  }

  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const MDX = project.data.body;
  const techStack = Array.from(
    new Set([...(project.data.frontend ?? []), ...(project.data.backend ?? [])]),
  );

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6 selection:bg-foreground/20 flex flex-col __variable_1e4310 __variable_c3aa02">
      <div className="flex-1">
        <div
          className="mb-6"
          style={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(-6px)' }}
        >
          <div className="fixed top-0 -left-[50px] z-50 hidden md:block" tabIndex={0}>
            <Link
              aria-label="Go back"
              role="button"
              href="/projects"
              className="group rounded-full flex items-center p-1 justify-center border border-secondary-foreground/20 bg-primary/5 hover:bg-primary/10 transition-all duration-200 shadow-xs"
            >
              <ChevronLeft className="lucide lucide-chevron-left size-6 text-secondary-foreground/70 group-hover:text-secondary-foreground transition-colors duration-200" />
            </Link>
          </div>
          <div className="flex md:flex-row flex-col md:justify-between md:items-center">
            <h1 className="title font-medium text-2xl tracking-tight">{project.data.title}</h1>
            <p className="prose dark:prose-invert text-pretty inline dark:text-neutral-400 text-sm text-gray-500">
              {project.data.type}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div
            className="flex flex-col gap-4"
            style={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(-6px)' }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-primary-foreground/50">
              <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-background/60 pointer-events-none" />
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={project.data.thumbnail}
                  alt={project.data.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority
                />
              </div>
            </div>
            {project.data.description && (
              <p className="prose dark:prose-invert text-pretty inline">
                {project.data.description}
              </p>
            )}
          </div>

          {techStack.length > 0 && (
            <div style={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(-6px)' }}>
              <h2 className="title font-medium text-lg mb-4">Technologies Used</h2>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => (
                  <TechPill key={tech} label={tech} />
                ))}
              </div>
            </div>
          )}

          {project.data.links.length > 0 && (
            <div
              className="flex flex-wrap gap-4"
              style={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(-6px)' }}
            >
              {project.data.links.map((link) => (
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

          <div
            className="prose dark:prose-invert max-w-none"
            style={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(-6px)' }}
          >
            <DocsBody>
              <MDX />
            </DocsBody>
          </div>
        </div>
      </div>
    </div>
  );
}
