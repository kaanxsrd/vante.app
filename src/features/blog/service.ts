import 'server-only';
import { and, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import { isForeignKeyViolation, isUniqueViolation } from '@/db/errors';
import { posts } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import { estimateReadingMinutes } from '@/features/content/reading-time';
import type { ContentStatus, PostInput } from './schema';

export class UnknownAuthorError extends Error {
  constructor(slug: string | null) {
    super(`There is no author with the slug "${slug}".`);
    this.name = 'UnknownAuthorError';
  }
}

export class PostConflictError extends Error {
  constructor(slug: string) {
    super(`A post with the slug "${slug}" already exists.`);
    this.name = 'PostConflictError';
  }
}

function toRow(input: PostInput) {
  return {
    ...input,
    readingMinutes: estimateReadingMinutes(input.content),
    publishedAt: input.publishedAt ?? (input.status === 'published' ? new Date() : null),
  };
}

export async function createPost(input: PostInput, actor: string) {
  try {
    const [post] = await db.insert(posts).values(toRow(input)).returning();
    if (!post) throw new Error('insert returned no row');
    await recordAudit({
      actor,
      action: 'post.create',
      entityType: 'post',
      entityId: post.id,
      summary: `Created post "${post.title}" as ${post.status}`,
    });
    return post;
  } catch (error) {
    if (isUniqueViolation(error)) throw new PostConflictError(input.slug);
    if (isForeignKeyViolation(error)) throw new UnknownAuthorError(input.author);
    throw error;
  }
}

export async function updatePost(id: string, input: PostInput, actor: string) {
  try {
    const [post] = await db
      .update(posts)
      .set({ ...toRow(input), updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    if (!post) return null;
    await recordAudit({
      actor,
      action: 'post.update',
      entityType: 'post',
      entityId: post.id,
      summary: `Updated post "${post.title}"`,
    });
    return post;
  } catch (error) {
    if (isUniqueViolation(error)) throw new PostConflictError(input.slug);
    if (isForeignKeyViolation(error)) throw new UnknownAuthorError(input.author);
    throw error;
  }
}

export async function setPostStatus(id: string, status: ContentStatus, actor: string) {
  const [post] = await db
    .update(posts)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === 'published'
        ? { publishedAt: sql`coalesce(${posts.publishedAt}, now())` }
        : {}),
    })
    .where(eq(posts.id, id))
    .returning();
  if (!post) return null;
  await recordAudit({
    actor,
    action: status === 'published' ? 'post.publish' : 'post.unpublish',
    entityType: 'post',
    entityId: post.id,
    summary: `${status === 'published' ? 'Published' : 'Unpublished'} post "${post.title}"`,
  });
  return post;
}

export async function deletePost(id: string, actor: string) {
  const [post] = await db.delete(posts).where(eq(posts.id, id)).returning({
    id: posts.id,
    title: posts.title,
  });
  if (!post) return null;
  await recordAudit({
    actor,
    action: 'post.delete',
    entityType: 'post',
    entityId: post.id,
    summary: `Deleted post "${post.title}"`,
  });
  return post;
}

export async function getPostById(id: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return post ?? null;
}

export async function getPostBySlug(slug: string) {
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return post ?? null;
}

export async function listAdminPosts(filters: {
  q?: string;
  status?: ContentStatus;
  category?: string;
  page: number;
  pageSize: number;
}) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(posts.status, filters.status));
  if (filters.category) conditions.push(eq(posts.category, filters.category));
  if (filters.q) {
    const term = `%${filters.q}%`;
    const match = or(
      ilike(posts.title, term),
      ilike(posts.slug, term),
      ilike(posts.description, term),
    );
    if (match) conditions.push(match);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total, categories] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        status: posts.status,
        category: posts.category,
        tags: posts.tags,
        featured: posts.featured,
        readingMinutes: posts.readingMinutes,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(where)
      .orderBy(desc(posts.updatedAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: sql<number>`count(*)::int` }).from(posts).where(where),
    db
      .selectDistinct({ category: posts.category })
      .from(posts)
      .where(sql`${posts.category} is not null`)
      .orderBy(posts.category),
  ]);

  return {
    rows,
    total: total[0]?.value ?? 0,
    categories: categories.flatMap((row) => (row.category ? [row.category] : [])),
  };
}
