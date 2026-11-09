import 'server-only';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { buildSafe } from '@/features/content/build-safe';

const isLive = and(eq(posts.status, 'published'), lte(posts.publishedAt, sql`now()`));

export type PublicPost = typeof posts.$inferSelect;

export const getPublishedPosts = cache(
  async (): Promise<PublicPost[]> =>
    buildSafe([], () => db.select().from(posts).where(isLive).orderBy(desc(posts.publishedAt))),
);

export const getPublishedPost = cache(
  async (slug: string): Promise<PublicPost | null> =>
    buildSafe(null, async () => {
      const [post] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.slug, slug), isLive))
        .limit(1);
      return post ?? null;
    }),
);

export async function getRelatedPosts(post: PublicPost, limit = 3): Promise<PublicPost[]> {
  const all = await getPublishedPosts();
  return all
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      candidate,
      overlap: candidate.tags.filter((tag) => post.tags.includes(tag)).length,
    }))
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        (b.candidate.publishedAt?.getTime() ?? 0) - (a.candidate.publishedAt?.getTime() ?? 0),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
