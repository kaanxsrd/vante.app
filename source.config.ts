import { defineConfig, defineDocs, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

export default defineConfig({
  lastModifiedTime: 'git',
  mdxOptions: {
    providerImportSource: '@/mdx-components',
  },
});

export const { docs, meta } = defineDocs({
  dir: 'data/blog',
  docs: {
    schema: frontmatterSchema.extend({
      date: z.string(),
      tags: z.array(z.string()).optional(),
      featured: z.boolean().optional().default(false),
      readTime: z.string().optional(),
      author: z.string().optional(),
      thumbnail: z.string().optional(),
    }),
  },
});

export const { docs: projectDocs, meta: projectMeta } = defineDocs({
  dir: 'data/projects',
  docs: {
    schema: frontmatterSchema.extend({
      type: z.string(),
      thumbnail: z.string(),
      frontend: z.array(z.string()).default([]),
      backend: z.array(z.string()).default([]),
      links: z
        .array(
          z.object({
            name: z.string(),
            href: z.string().min(1),
          }),
        )
        .default([]),
    }),
  },
});
