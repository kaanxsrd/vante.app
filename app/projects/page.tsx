import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { CardBody, CardContainer } from '@/components/magicui/tilt-card';
import { getAllProjects } from '@/lib/projects';

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6 selection:bg-foreground/20 flex flex-col __variable_1e4310 __variable_c3aa02">
      <div className="flex-1">
        <div className="mb-8">
          <div className="relative flex items-center gap-3">
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
            <h1 className="title font-medium text-2xl tracking-tight">Projects</h1>
          </div>
        </div>

        <div className="space-y-8">
          {projects.length === 0 ? (
            <p className="text-muted-foreground">No projects added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <CardContainer key={project.url} containerClassName="w-full" className="w-full">
                  <CardBody className="w-full">
                    <Link
                      className="block w-full overflow-hidden rounded-lg border bg-primary-foreground/50 transition-all duration-200 ease-in hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                        <h2 className="title font-medium mt-1 text-md">{project.data.title}</h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {project.data.type}
                        </p>
                      </div>
                    </Link>
                  </CardBody>
                </CardContainer>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
