import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { count, eq, inArray } from 'drizzle-orm';
import { closeDatabase, db } from '@/db';
import { authors, media, posts, projects, settings } from '@/db/schema';
import { estimateReadingMinutes } from '@/features/content/reading-time';
import { copySchema, DEFAULT_COPY } from '@/features/copy/schema';
import { profileSchema } from '@/features/profile/schema';
import { type ArtOptions, renderArt } from './seed-data/art';
import {
  AUTHOR_SLUG,
  AVATAR_ART,
  STARTER_AUTHOR,
  STARTER_POSTS,
  STARTER_PROJECTS,
  starterCopy,
  starterProfile,
} from './seed-data/content';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MS_PER_DAY = 86_400_000;
const PNG = 'image/png';
const COVER_SIZE = { width: 960, height: 640 };
const AVATAR_SIZE = { width: 320, height: 320 };

async function databaseHasContent(): Promise<boolean> {
  const [[postCount], [projectCount], [authorCount], existing] = await Promise.all([
    db.select({ value: count() }).from(posts),
    db.select({ value: count() }).from(projects),
    db.select({ value: count() }).from(authors),
    db
      .select({ key: settings.key })
      .from(settings)
      .where(inArray(settings.key, ['profile', 'copy'])),
  ]);
  return (
    (postCount?.value ?? 0) + (projectCount?.value ?? 0) + (authorCount?.value ?? 0) > 0 ||
    existing.length > 0
  );
}

async function storeFile(
  tx: Transaction,
  filename: string,
  contentType: string,
  data: Buffer,
): Promise<string> {
  const sha256 = createHash('sha256').update(data).digest('hex');
  await tx
    .insert(media)
    .values({ filename, contentType, size: data.byteLength, sha256, data })
    .onConflictDoNothing({ target: media.sha256 });
  const [row] = await tx.select({ id: media.id }).from(media).where(eq(media.sha256, sha256));
  if (!row) throw new Error(`Could not store ${filename}`);
  return `/media/${row.id}`;
}

function storeArt(tx: Transaction, filename: string, options: ArtOptions): Promise<string> {
  return storeFile(tx, filename, PNG, renderArt(options));
}

async function seed(): Promise<void> {
  const worldMap = await readFile(join(import.meta.dir, 'seed-data/world.svg'));

  await db.transaction(async (tx) => {
    const avatar = await storeArt(tx, 'avatar.png', { ...AVATAR_SIZE, ...AVATAR_ART });
    const mapImage = await storeFile(tx, 'world.svg', 'image/svg+xml', worldMap);

    await tx.insert(settings).values([
      {
        key: 'profile',
        value: profileSchema.parse(starterProfile({ avatar, logo: avatar, favicon: avatar })),
      },
      { key: 'copy', value: copySchema.parse({ ...DEFAULT_COPY, ...starterCopy(mapImage) }) },
    ]);

    await tx.insert(authors).values({ ...STARTER_AUTHOR, avatar });

    for (const { art, daysAgo, ...post } of STARTER_POSTS) {
      await tx.insert(posts).values({
        ...post,
        author: AUTHOR_SLUG,
        thumbnail: await storeArt(tx, `${post.slug}.png`, { ...COVER_SIZE, ...art }),
        readingMinutes: estimateReadingMinutes(post.content),
        status: 'published',
        publishedAt: new Date(Date.now() - daysAgo * MS_PER_DAY),
      });
    }

    for (const [sortOrder, { art, ...project }] of STARTER_PROJECTS.entries()) {
      await tx.insert(projects).values({
        ...project,
        sortOrder,
        thumbnail: await storeArt(tx, `${project.slug}.png`, { ...COVER_SIZE, ...art }),
        status: 'published',
        publishedAt: new Date(),
      });
    }
  });
}

try {
  if (await databaseHasContent()) {
    console.log('This database already has content, so nothing was changed.');
  } else {
    await seed();
    console.log(
      `Added starter content: ${STARTER_POSTS.length} posts, ${STARTER_PROJECTS.length} projects, your profile and all the site text.`,
    );
    console.log('Sign in to the dashboard and make it yours under Site Profile and Site Text.');
  }
} finally {
  await closeDatabase();
}
