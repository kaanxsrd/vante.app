'use server';

import { z } from 'zod';
import { recordAudit } from '@/features/audit/service';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { kickBackgroundWork } from '@/features/jobs/scheduler';
import { notificationSettingsSchema } from '@/features/settings/schema';
import { getSetting, saveSetting } from '@/features/settings/service';
import { activeEmailProvider } from '@/lib/email';
import { consumeRateLimit } from '@/lib/rate-limit';
import { idSchema } from '@/lib/validation';
import { resolveRecipient, retryNotification, sendTestNotification } from './service';

export const saveNotificationSettingsAction = adminAction(
  notificationSettingsSchema,
  async (input, admin) => {
    await saveSetting('notifications', input);
    await recordAudit({
      actor: admin.email,
      action: 'settings.notifications',
      entityType: 'settings',
      entityId: 'notifications',
      summary: 'Updated notification preferences',
    });
    return null;
  },
);

export const sendTestNotificationAction = adminAction(z.object({}), async (_input, admin) => {
  if (!activeEmailProvider()) {
    throw new ActionError('No email provider is configured. Set RESEND_API_KEY first.');
  }
  const limit = await consumeRateLimit({
    key: `notification-test:${admin.userId}`,
    limit: 10,
    windowMs: 3_600_000,
  });
  if (!limit.allowed) throw new ActionError('Too many test emails. Try again later.');

  const recipient = resolveRecipient(await getSetting('notifications'));
  if (!recipient) throw new ActionError('Set a notification email address first.');

  const notification = await sendTestNotification(recipient);
  if (notification?.status !== 'sent') {
    throw new ActionError(`Delivery failed: ${notification?.error ?? 'unknown error'}`);
  }
  return { recipient };
});

export const retryNotificationAction = adminAction(idSchema, async ({ id }) => {
  const retried = await retryNotification(id);
  if (!retried) throw new ActionError('That notification no longer exists.');
  await kickBackgroundWork();
  return null;
});
