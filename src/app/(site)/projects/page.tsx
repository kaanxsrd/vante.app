import type { Metadata } from 'next';
import { RevealGroup } from '@/components/magicui/reveal-group';
import { CopyText } from '@/components/site/copy-text';
import { PageHeading } from '@/components/site/page-heading';
import { ProjectCard } from '@/components/site/project-card';
import { getCopy } from '@/features/copy/queries';
import { isCopyGroupBlank } from '@/features/copy/schema';
import { getPublishedProjects } from '@/features/projects/queries';
import { stagger } from '@/lib/utils';

export const revalidate = 300;

const FIRST_ROW = 2;

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy['projects.metaTitle'], description: copy['projects.metaDescription'] };
}

export default async function ProjectsPage() {
  const [projects, copy] = await Promise.all([getPublishedProjects(), getCopy()]);
  const pending = isCopyGroupBlank(copy, 'projects');

  return (
    <div className="mb-8 sm:mb-0 bg-background font-sans min-h-screen antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6 selection:bg-foreground/20 flex flex-col">
      <div className="flex-1">
        <PageHeading title={copy['projects.heading']} pending={pending} />
        <div className="space-y-8">
          {projects.length === 0 ? (
            <p className="text-muted-foreground">
              <CopyText text={copy['projects.empty']} pending={pending} className="w-48" />
            </p>
          ) : (
            <RevealGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project, index) => (
                <div key={project.slug} style={stagger(index)}>
                  <ProjectCard project={project} eager={index < FIRST_ROW} />
                </div>
              ))}
            </RevealGroup>
          )}
        </div>
      </div>
    </div>
  );
}
