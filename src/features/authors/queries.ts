import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { buildSafe } from '@/features/content/build-safe';

export type Author = typeof authors.$inferSelect;

export const getAuthorBySlug = cache(
  async (slug: string): Promise<Author | null> =>
    buildSafe(null, async () => {
      const [author] = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
      return author ?? null;
    }),
);

export async function listAuthorOptions() {
  return db
    .select({ slug: authors.slug, name: authors.name })
    .from(authors)
    .orderBy(asc(authors.createdAt));
}

export async function getDefaultAuthorSlug(): Promise<string | null> {
  const [first] = await listAuthorOptions();
  return first?.slug ?? null;
}
