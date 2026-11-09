'use server';

import { isIP } from 'node:net';
import { z } from 'zod';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { severitySchema } from '@/features/settings/schema';
import { idSchema } from '@/lib/validation';
import { RULE_IDS } from './rules';
import {
  confirmThreat,
  deleteIpRule,
  saveIpRule,
  saveSecurityRule,
  updateEventStatus,
} from './service';

const noteSchema = z.string().trim().max(1000).optional().default('');

export const updateEventStatusAction = adminAction(
  z.object({
    id: z.uuid(),
    status: z.enum(['open', 'acknowledged', 'resolved', 'false_positive']),
    note: noteSchema,
  }),
  async ({ id, status, note }, admin) => {
    const event = await updateEventStatus(id, status, note, admin.email);
    if (!event) throw new ActionError('That incident no longer exists.');
    return null;
  },
);

export const confirmThreatAction = adminAction(
  z.object({ id: z.uuid(), note: noteSchema }),
  async ({ id, note }, admin) => {
    const event = await confirmThreat(id, note, admin.email);
    if (!event) throw new ActionError('That incident no longer exists.');
    return null;
  },
);

export const saveRuleAction = adminAction(
  z.object({
    ruleId: z.enum(RULE_IDS),
    enabled: z.boolean(),
    severity: severitySchema,
    threshold: z.number().int().min(1).max(1_000_000),
    windowSeconds: z.number().int().min(10).max(7_776_000),
    cooldownSeconds: z.number().int().min(0).max(2_592_000),
    notify: z.boolean(),
    autoSuspend: z.boolean(),
    suspendMinutes: z.number().int().min(1).max(43_200),
  }),
  async (input, admin) => {
    await saveSecurityRule(input, admin.email);
    return null;
  },
);

export const saveIpRuleAction = adminAction(
  z.object({
    ip: z
      .string()
      .trim()
      .refine((value) => isIP(value) !== 0, 'Enter a valid IP address'),
    action: z.enum(['watch', 'block']),
    reason: z.string().trim().max(300).optional().default(''),
    expiresAt: z.coerce.date().nullable().default(null),
  }),
  async (input, admin) => {
    await saveIpRule(input, admin.email);
    return null;
  },
);

export const deleteIpRuleAction = adminAction(idSchema, async ({ id }, admin) => {
  const rule = await deleteIpRule(id, admin.email);
  if (!rule) throw new ActionError('That rule no longer exists.');
  return null;
});
