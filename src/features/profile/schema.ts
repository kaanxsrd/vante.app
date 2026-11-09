import { z } from 'zod';
import { iconIdSchema } from '@/features/icons/schema';
import { optionalAssetUrlSchema, tagListSchema } from '@/lib/validation';

export function isSafeLinkUrl(value: string): boolean {
  return /^(https?:\/\/|mailto:)\S+$/i.test(value) || /^\/(?![/\\])\S*$/.test(value);
}

const linkUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeLinkUrl, 'Links must start with https://, mailto: or /');

function uniqueBy<Field extends string>(field: Field, label: string) {
  return (items: Record<Field, string>[], context: z.RefinementCtx) => {
    const seen = new Set<string>();
    for (const item of items) {
      const key = item[field].toLowerCase();
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          message: `"${item[field]}" is listed twice in ${label}.`,
        });
      }
      seen.add(key);
    }
  };
}

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Your name is required').max(80),
  title: z.string().trim().min(1, 'Your title is required').max(80),
  intro: z.string().trim().max(1000, 'The first paragraph is too long'),
  about: z.string().trim().max(1000, 'The second paragraph is too long'),
  siteName: z.string().trim().max(80, 'The site name is too long'),
  initials: z.string().trim().max(4, 'Initials can be at most 4 characters'),
  description: z.string().trim().max(300, 'The site description is too long'),
  keywords: tagListSchema,
  avatar: optionalAssetUrlSchema,
  logo: optionalAssetUrlSchema,
  favicon: optionalAssetUrlSchema,
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Every technology needs a name').max(40),
        icon: iconIdSchema,
      }),
    )
    .max(60, 'The tech stack can have at most 60 items')
    .superRefine(uniqueBy('name', 'the tech stack')),
  socials: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Every social link needs a name').max(40),
        url: linkUrlSchema,
        icon: iconIdSchema,
      }),
    )
    .max(12, 'You can have at most 12 social links')
    .superRefine(uniqueBy('name', 'your social links')),
  navigation: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Every menu item needs a label').max(40),
        href: linkUrlSchema,
        icon: iconIdSchema,
      }),
    )
    .max(8, 'The menu can have at most 8 items')
    .superRefine(uniqueBy('href', 'the menu')),
});

export type SiteProfile = z.output<typeof profileSchema>;

export const DEFAULT_PROFILE: SiteProfile = {
  name: '',
  title: '',
  intro: '',
  about: '',
  siteName: '',
  initials: '',
  description: '',
  keywords: [],
  avatar: '',
  logo: '',
  favicon: '',
  skills: [],
  socials: [],
  navigation: [],
};
