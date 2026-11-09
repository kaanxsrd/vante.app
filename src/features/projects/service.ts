import 'server-only';
import { and, asc, desc, eq, gt, ilike, lt, or, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import { isUniqueViolation } from '@/db/errors';
import { projects } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import type { ContentStatus } from '@/features/blog/schema';
import type { ProjectInput } from './schema';

export class ProjectConflictError extends Error {
  constructor(slug: string) {
    super(`A project with the slug "${slug}" already exists.`);
    this.name = 'ProjectConflictError';
  }
}

function toRow(input: ProjectInput) {
  return { ...input, publishedAt: input.status === 'published' ? new Date() : null };
}

export async function createProject(input: ProjectInput, actor: string) {
  const [last] = await db
    .select({ value: sql<number>`coalesce(max(${projects.sortOrder}), -1)::int` })
    .from(projects);
  try {
    const [project] = await db
      .insert(projects)
      .values({ ...toRow(input), sortOrder: (last?.value ?? -1) + 1 })
      .returning();
    if (!project) throw new Error('insert returned no row');
    await recordAudit({
      actor,
      action: 'project.create',
      entityType: 'project',
      entityId: project.id,
      summary: `Created project "${project.title}" as ${project.status}`,
    });
    return project;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ProjectConflictError(input.slug);
    throw error;
  }
}

export async function updateProject(id: string, input: ProjectInput, actor: string) {
  try {
    const { publishedAt, ...row } = toRow(input);
    const [project] = await db
      .update(projects)
      .set({
        ...row,
        publishedAt:
          input.status === 'published'
            ? sql`coalesce(${projects.publishedAt}, now())`
            : publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    if (!project) return null;
    await recordAudit({
      actor,
      action: 'project.update',
      entityType: 'project',
      entityId: project.id,
      summary: `Updated project "${project.title}"`,
    });
    return project;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ProjectConflictError(input.slug);
    throw error;
  }
}

export async function setProjectStatus(id: string, status: ContentStatus, actor: string) {
  const [project] = await db
    .update(projects)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === 'published'
        ? { publishedAt: sql`coalesce(${projects.publishedAt}, now())` }
        : {}),
    })
    .where(eq(projects.id, id))
    .returning();
  if (!project) return null;
  await recordAudit({
    actor,
    action: status === 'published' ? 'project.publish' : 'project.unpublish',
    entityType: 'project',
    entityId: project.id,
    summary: `${status === 'published' ? 'Published' : 'Unpublished'} project "${project.title}"`,
  });
  return project;
}

export async function deleteProject(id: string, actor: string) {
  const [project] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id, title: projects.title });
  if (!project) return null;
  await recordAudit({
    actor,
    action: 'project.delete',
    entityType: 'project',
    entityId: project.id,
    summary: `Deleted project "${project.title}"`,
  });
  return project;
}

export async function moveProject(id: string, direction: 'up' | 'down', actor: string) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: projects.id, sortOrder: projects.sortOrder, title: projects.title })
      .from(projects)
      .where(eq(projects.id, id))
      .for('update');
    if (!current) return;

    const [neighbour] = await tx
      .select({ id: projects.id, sortOrder: projects.sortOrder })
      .from(projects)
      .where(
        direction === 'up'
          ? lt(projects.sortOrder, current.sortOrder)
          : gt(projects.sortOrder, current.sortOrder),
      )
      .orderBy(direction === 'up' ? desc(projects.sortOrder) : asc(projects.sortOrder))
      .limit(1)
      .for('update');
    if (!neighbour) return;

    await tx
      .update(projects)
      .set({ sortOrder: neighbour.sortOrder })
      .where(eq(projects.id, current.id));
    await tx
      .update(projects)
      .set({ sortOrder: current.sortOrder })
      .where(eq(projects.id, neighbour.id));
  });
  await recordAudit({
    actor,
    action: 'project.reorder',
    entityType: 'project',
    entityId: id,
    summary: `Moved a project ${direction} in the custom order`,
  });
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project ?? null;
}

export async function getProjectBySlug(slug: string) {
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return project ?? null;
}

export async function listAdminProjects(filters: {
  q?: string;
  status?: ContentStatus;
  category?: string;
  page: number;
  pageSize: number;
}) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(projects.status, filters.status));
  if (filters.category) conditions.push(eq(projects.category, filters.category));
  if (filters.q) {
    const term = `%${filters.q}%`;
    const match = or(ilike(projects.title, term), ilike(projects.slug, term));
    if (match) conditions.push(match);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total, categories] = await Promise.all([
    db
      .select({
        id: projects.id,
        title: projects.title,
        slug: projects.slug,
        status: projects.status,
        category: projects.category,
        thumbnail: projects.thumbnail,
        featured: projects.featured,
        sortOrder: projects.sortOrder,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(where)
      .orderBy(asc(projects.sortOrder), asc(projects.title))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: sql<number>`count(*)::int` }).from(projects).where(where),
    db.selectDistinct({ category: projects.category }).from(projects).orderBy(projects.category),
  ]);

  return {
    rows,
    total: total[0]?.value ?? 0,
    categories: categories.map((row) => row.category),
  };
}
