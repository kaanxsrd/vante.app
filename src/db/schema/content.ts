import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const contentStatus = pgEnum('content_status', ['draft', 'published']);

export interface ProjectLink {
  name: string;
  href: string;
}

export const authors = pgTable('authors', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  position: text('position').notNull().default(''),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    content: text('content').notNull().default(''),
    category: text('category'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    author: text('author').references(() => authors.slug, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    thumbnail: text('thumbnail'),
    featured: boolean('featured').notNull().default(false),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogImage: text('og_image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('posts_status_published_at_idx').on(t.status, t.publishedAt.desc()),
    index('posts_updated_at_idx').on(t.updatedAt.desc()),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    content: text('content').notNull().default(''),
    category: text('category').notNull().default('Web Application'),
    thumbnail: text('thumbnail'),
    gallery: text('gallery').array().notNull().default(sql`'{}'::text[]`),
    frontend: text('frontend').array().notNull().default(sql`'{}'::text[]`),
    backend: text('backend').array().notNull().default(sql`'{}'::text[]`),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    githubUrl: text('github_url'),
    liveUrl: text('live_url'),
    links: jsonb('links').$type<ProjectLink[]>().notNull().default([]),
    featured: boolean('featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogImage: text('og_image'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('projects_status_sort_order_idx').on(t.status, t.sortOrder)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const media = pgTable(
  'media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull().unique(),
    data: bytea('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('media_created_at_idx').on(t.createdAt.desc())],
);
