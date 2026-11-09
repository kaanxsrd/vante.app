import { z } from 'zod';
import { slugSchema } from '@/lib/slug';
import { assetUrlSchema, nullable, tagListSchema } from '@/lib/validation';

export const CONTENT_STATUSES = ['draft', 'published'] as const;
export const contentStatusSchema = z.enum(CONTENT_STATUSES);
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const postInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: slugSchema,
  description: z.string().trim().max(500).default(''),
  content: z.string().max(200_000, 'Content is too long'),
  author: nullable(slugSchema).default(null),
  category: nullable(z.string().trim().max(60)).default(null),
  tags: tagListSchema.default([]),
  thumbnail: nullable(assetUrlSchema).default(null),
  featured: z.boolean().default(false),
  status: contentStatusSchema.default('draft'),
  publishedAt: nullable(z.coerce.date()).default(null),
  seoTitle: nullable(z.string().trim().max(200)).default(null),
  seoDescription: nullable(z.string().trim().max(320)).default(null),
  ogImage: nullable(assetUrlSchema).default(null),
});

export type PostInput = z.output<typeof postInputSchema>;
