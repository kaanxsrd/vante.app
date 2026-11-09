'use server';

import { updateTag } from 'next/cache';
import { recordAudit } from '@/features/audit/service';
import { adminAction } from '@/features/auth/create-action';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { saveSetting } from '@/features/settings/service';
import { COPY_CACHE_TAG } from './queries';
import { copySchema } from './schema';

export const saveCopyAction = adminAction(copySchema, async (input, admin) => {
  await saveSetting('copy', input);
  await recordAudit({
    actor: admin.email,
    action: 'settings.copy',
    entityType: 'settings',
    entityId: 'copy',
    summary: 'Updated the site text',
  });
  updateTag(COPY_CACHE_TAG);
  revalidatePublicContent();
  return null;
});
