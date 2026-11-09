'use server';

import { recordAudit } from '@/features/audit/service';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { requireAdminAction, UnauthorizedError } from '@/features/auth/session';
import { logger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import { type ActionResult, idSchema } from '@/lib/validation';
import { deleteImage, MediaError, storeImage } from './service';

export const deleteMediaAction = adminAction(idSchema, async ({ id }, admin) => {
  const image = await deleteImage(id).catch((error: unknown) => {
    if (error instanceof MediaError) throw new ActionError(error.message);
    throw error;
  });
  if (!image) throw new ActionError('That image no longer exists.');
  await recordAudit({
    actor: admin.email,
    action: 'media.delete',
    entityType: 'media',
    entityId: image.id,
    summary: `Deleted image ${image.filename}`,
  });
  return null;
});

export async function uploadImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const admin = await requireAdminAction();
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, error: 'No file was provided.' };

    const limit = await consumeRateLimit({
      key: `media-upload:${admin.userId}`,
      limit: 60,
      windowMs: 3_600_000,
    });
    if (!limit.allowed) return { ok: false, error: 'Too many uploads. Try again later.' };

    const { id, url } = await storeImage(file);
    await recordAudit({
      actor: admin.email,
      action: 'media.upload',
      entityType: 'media',
      entityId: id,
      summary: `Uploaded image ${file.name.slice(0, 120)}`,
    });
    return { ok: true, data: { url } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: 'Your session has expired. Sign in again.' };
    }
    if (error instanceof MediaError) return { ok: false, error: error.message };
    logger.error('image upload failed', { error });
    return { ok: false, error: 'The upload failed.' };
  }
}
