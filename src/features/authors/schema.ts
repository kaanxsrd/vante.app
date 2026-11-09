import { z } from 'zod';
import { slugSchema } from '@/lib/slug';
import { assetUrlSchema, nullable } from '@/lib/validation';

export const authorInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  slug: slugSchema,
  position: z.string().trim().max(80).default(''),
  avatar: nullable(assetUrlSchema).default(null),
});

export type AuthorInput = z.output<typeof authorInputSchema>;
