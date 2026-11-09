'use server';

import { updateTag } from 'next/cache';
import { recordAudit } from '@/features/audit/service';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { resolveIcons } from '@/features/icons/catalog';
import { saveSetting } from '@/features/settings/service';
import { PROFILE_CACHE_TAG } from './queries';
import { profileSchema } from './schema';

export const saveProfileAction = adminAction(profileSchema, async (input, admin) => {
  const chosen = [...input.skills, ...input.socials, ...input.navigation].map((item) => item.icon);
  const known = await resolveIcons(chosen);
  const unknown = chosen.find((id) => !known[id]);
  if (unknown) throw new ActionError(`"${unknown}" is not in the icon library.`);

  await saveSetting('profile', input);
  await recordAudit({
    actor: admin.email,
    action: 'settings.profile',
    entityType: 'settings',
    entityId: 'profile',
    summary: 'Updated the site profile',
    metadata: { skills: input.skills.length, socials: input.socials.length },
  });
  updateTag(PROFILE_CACHE_TAG);
  revalidatePublicContent();
  return null;
});
