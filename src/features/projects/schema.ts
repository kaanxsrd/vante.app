import { z } from 'zod';
import { contentStatusSchema } from '@/features/blog/schema';
import { slugSchema } from '@/lib/slug';
import { assetUrlSchema, httpUrlSchema, nullable, tagListSchema } from '@/lib/validation';

const projectLinkSchema = z.object({
  name: z.string().trim().min(1, 'Link name is required').max(40),
  href: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
      message: 'Must be a URL or a path starting with /',
    }),
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: slugSchema,
  description: z.string().trim().max(500).default(''),
  content: z.string().max(200_000, 'Content is too long'),
  category: z.string().trim().min(1, 'Category is required').max(60),
  thumbnail: nullable(assetUrlSchema).default(null),
  gallery: z.array(assetUrlSchema).max(24).default([]),
  frontend: tagListSchema.default([]),
  backend: tagListSchema.default([]),
  tags: tagListSchema.default([]),
  githubUrl: nullable(httpUrlSchema).default(null),
  liveUrl: nullable(httpUrlSchema).default(null),
  links: z.array(projectLinkSchema).max(12).default([]),
  featured: z.boolean().default(false),
  status: contentStatusSchema.default('draft'),
  seoTitle: nullable(z.string().trim().max(200)).default(null),
  seoDescription: nullable(z.string().trim().max(320)).default(null),
  ogImage: nullable(assetUrlSchema).default(null),
});

export type ProjectInput = z.output<typeof projectInputSchema>;
