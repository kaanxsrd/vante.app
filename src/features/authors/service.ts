import 'server-only';
import { asc, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { isUniqueViolation } from '@/db/errors';
import { authors, posts } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import type { AuthorInput } from './schema';

export class AuthorConflictError extends Error {
  constructor(slug: string) {
    super(`An author with the slug "${slug}" already exists.`);
    this.name = 'AuthorConflictError';
  }
}

export async function listAuthorsWithPostCounts() {
  return db
    .select({
      id: authors.id,
      slug: authors.slug,
      name: authors.name,
      position: authors.position,
      avatar: authors.avatar,
      posts: count(posts.id),
    })
    .from(authors)
    .leftJoin(posts, eq(posts.author, authors.slug))
    .groupBy(authors.id)
    .orderBy(asc(authors.createdAt));
}

export async function createAuthor(input: AuthorInput, actor: string) {
  try {
    const [author] = await db.insert(authors).values(input).returning();
    if (!author) throw new Error('insert returned no row');
    await recordAudit({
      actor,
      action: 'author.create',
      entityType: 'author',
      entityId: author.id,
      summary: `Added author "${author.name}"`,
    });
    return author;
  } catch (error) {
    if (isUniqueViolation(error)) throw new AuthorConflictError(input.slug);
    throw error;
  }
}

export async function updateAuthor(id: string, input: AuthorInput, actor: string) {
  try {
    const [author] = await db
      .update(authors)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(authors.id, id))
      .returning();
    if (!author) return null;
    await recordAudit({
      actor,
      action: 'author.update',
      entityType: 'author',
      entityId: author.id,
      summary: `Updated author "${author.name}"`,
    });
    return author;
  } catch (error) {
    if (isUniqueViolation(error)) throw new AuthorConflictError(input.slug);
    throw error;
  }
}

export async function deleteAuthor(id: string, actor: string) {
  const [author] = await db
    .delete(authors)
    .where(eq(authors.id, id))
    .returning({ id: authors.id, name: authors.name });
  if (!author) return null;
  await recordAudit({
    actor,
    action: 'author.delete',
    entityType: 'author',
    entityId: author.id,
    summary: `Deleted author "${author.name}"`,
  });
  return author;
}
