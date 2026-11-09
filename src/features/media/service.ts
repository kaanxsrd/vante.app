import 'server-only';
import { createHash } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { authors, media, posts, projects, settings } from '@/db/schema';
import { detectImageType, MAX_MEDIA_BYTES, sanitizeFilename } from './validate';

export class MediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaError';
  }
}

function mediaUrl(id: string): string {
  return `/media/${id}`;
}

export async function storeImage(file: File): Promise<{ id: string; url: string }> {
  if (file.size === 0) throw new MediaError('The file is empty.');
  if (file.size > MAX_MEDIA_BYTES) throw new MediaError('Images can be at most 8 MB.');

  const data = Buffer.from(await file.arrayBuffer());
  const contentType = detectImageType(data);
  if (!contentType) throw new MediaError('Upload a PNG, JPEG, WebP, GIF or AVIF image.');

  const sha256 = createHash('sha256').update(data).digest('hex');

  await db
    .insert(media)
    .values({
      filename: sanitizeFilename(file.name),
      contentType,
      size: data.byteLength,
      sha256,
      data,
    })
    .onConflictDoNothing({ target: media.sha256 });

  const [row] = await db.select({ id: media.id }).from(media).where(eq(media.sha256, sha256));
  if (!row) throw new MediaError('The upload could not be saved.');
  return { id: row.id, url: mediaUrl(row.id) };
}

export async function getImage(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return row ?? null;
}

export async function listMedia({ page, pageSize }: { page: number; pageSize: number }) {
  const [rows, total] = await Promise.all([
    db
      .select({
        id: media.id,
        filename: media.filename,
        contentType: media.contentType,
        size: media.size,
      })
      .from(media)
      .orderBy(desc(media.createdAt), desc(media.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)::int` }).from(media),
  ]);
  return {
    rows: rows.map((row) => ({ ...row, url: mediaUrl(row.id) })),
    total: total[0]?.value ?? 0,
  };
}

async function findMediaUsage(url: string): Promise<string | null> {
  const pattern = `%${url}%`;
  const [row] = await db.execute<{ place: string }>(sql`
    select 'a blog post' as place from ${posts}
      where ${posts.thumbnail} = ${url} or ${posts.ogImage} = ${url} or ${posts.content} like ${pattern}
    union all
    select 'a project' from ${projects}
      where ${projects.thumbnail} = ${url} or ${projects.ogImage} = ${url}
        or ${url} = any(${projects.gallery}) or ${projects.content} like ${pattern}
    union all
    select 'an author' from ${authors} where ${authors.avatar} = ${url}
    union all
    select 'the site settings' from ${settings} where ${settings.value}::text like ${pattern}
    limit 1
  `);
  return row?.place ?? null;
}

export async function deleteImage(id: string) {
  const place = await findMediaUsage(mediaUrl(id));
  if (place) throw new MediaError(`This image is still used by ${place}.`);

  const [row] = await db
    .delete(media)
    .where(eq(media.id, id))
    .returning({ id: media.id, filename: media.filename });
  return row ?? null;
}
