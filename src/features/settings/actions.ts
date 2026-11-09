'use server';

import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { pageViews } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import { adminAction } from '@/features/auth/create-action';
import { analyticsSettingsSchema, retentionSettingsSchema } from './schema';
import { saveSetting } from './service';

export const saveAnalyticsSettingsAction = adminAction(
  analyticsSettingsSchema,
  async (input, admin) => {
    await saveSetting('analytics', input);
    await recordAudit({
      actor: admin.email,
      action: 'settings.analytics',
      entityType: 'settings',
      entityId: 'analytics',
      summary: `Website analytics ${input.enabled ? 'enabled' : 'disabled'}, retention ${input.retentionDays} days`,
    });
    return null;
  },
);

export const saveRetentionSettingsAction = adminAction(
  retentionSettingsSchema,
  async (input, admin) => {
    await saveSetting('retention', input);
    await recordAudit({
      actor: admin.email,
      action: 'settings.retention',
      entityType: 'settings',
      entityId: 'retention',
      summary: 'Updated data retention periods',
      metadata: input,
    });
    return null;
  },
);

export const purgeAnalyticsAction = adminAction(
  z.object({ confirm: z.literal(true) }),
  async (_input, admin) => {
    const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(pageViews);
    await db.delete(pageViews);
    await recordAudit({
      actor: admin.email,
      action: 'settings.analytics_purge',
      entityType: 'settings',
      entityId: 'analytics',
      summary: `Deleted all website analytics (${row?.value ?? 0} page views)`,
    });
    return { deleted: row?.value ?? 0 };
  },
);
