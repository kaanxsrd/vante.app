import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { buildSafe } from '@/features/content/build-safe';

const isLive = eq(projects.status, 'published');

export type PublicProject = typeof projects.$inferSelect;

export const getPublishedProjects = cache(
  async (): Promise<PublicProject[]> =>
    buildSafe([], () =>
      db
        .select()
        .from(projects)
        .where(isLive)
        .orderBy(asc(projects.sortOrder), asc(projects.title)),
    ),
);

export const getPublishedProject = cache(
  async (slug: string): Promise<PublicProject | null> =>
    buildSafe(null, async () => {
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.slug, slug), isLive))
        .limit(1);
      return project ?? null;
    }),
);

export async function getHomeProjects(limit = 2): Promise<PublicProject[]> {
  return buildSafe([], () =>
    db
      .select()
      .from(projects)
      .where(isLive)
      .orderBy(desc(projects.featured), asc(projects.sortOrder), asc(projects.title))
      .limit(limit),
  );
}

export function projectLinks(project: PublicProject) {
  return [
    ...(project.liveUrl ? [{ name: 'Live Site', href: project.liveUrl }] : []),
    ...(project.githubUrl ? [{ name: 'GitHub', href: project.githubUrl }] : []),
    ...project.links,
  ];
}
