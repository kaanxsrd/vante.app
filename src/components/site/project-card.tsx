import Link from 'next/link';
import { CardBody, CardContainer } from '@/components/magicui/tilt-card';
import { ContentImage } from '@/components/site/content-image';
import type { PublicProject } from '@/features/projects/queries';

export function ProjectCard({
  project,
  eager = false,
}: {
  project: PublicProject;
  eager?: boolean;
}) {
  return (
    <CardContainer containerClassName="w-full" className="w-full">
      <CardBody className="w-full">
        <Link
          className="group block w-full overflow-hidden rounded-xl border bg-primary-foreground/50 transition-[border-color,box-shadow] duration-300 hover:border-foreground/20 hover:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href={`/projects/${project.slug}`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            {project.thumbnail && (
              <ContentImage
                src={project.thumbnail}
                alt={project.title}
                fill
                loading={eager ? 'eager' : undefined}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            )}
          </div>
          <div className="px-4 py-3">
            <h2 className="title mt-1 text-lg font-medium">{project.title}</h2>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
              {project.category}
            </p>
          </div>
        </Link>
      </CardBody>
    </CardContainer>
  );
}
