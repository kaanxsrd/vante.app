'use server';

import { ActionError, adminAction } from '@/features/auth/create-action';
import { idSchema } from '@/lib/validation';
import {
  createApiKeySchema,
  revokeApiKeySchema,
  rotateApiKeySchema,
  suspendApiKeySchema,
  updateApiKeySchema,
} from './schema';
import {
  createApiKey,
  deleteRevokedApiKey,
  reinstateApiKey,
  revokeApiKey,
  rotateApiKey,
  suspendApiKey,
  updateApiKey,
} from './service';

const GONE = 'That key no longer exists or has been revoked.';

export const createApiKeyAction = adminAction(createApiKeySchema, async (input, admin) => {
  const { record, key } = await createApiKey(input, admin.email);
  return { id: record.id, name: record.name, key };
});

export const updateApiKeyAction = adminAction(updateApiKeySchema, async (input, admin) => {
  const record = await updateApiKey(input, admin.email);
  if (!record) throw new ActionError(GONE);
  return null;
});

export const rotateApiKeyAction = adminAction(
  rotateApiKeySchema,
  async ({ id, graceHours }, admin) => {
    const result = await rotateApiKey(id, graceHours, admin.email);
    if (!result) throw new ActionError(GONE);
    return { id: result.record.id, name: result.record.name, key: result.key };
  },
);

export const revokeApiKeyAction = adminAction(revokeApiKeySchema, async ({ id, reason }, admin) => {
  const record = await revokeApiKey(id, reason, admin.email);
  if (!record) throw new ActionError(GONE);
  return null;
});

export const suspendApiKeyAction = adminAction(
  suspendApiKeySchema,
  async ({ id, minutes, reason }, admin) => {
    const record = await suspendApiKey(id, minutes, reason, admin.email);
    if (!record) throw new ActionError(GONE);
    return null;
  },
);

export const reinstateApiKeyAction = adminAction(idSchema, async ({ id }, admin) => {
  const record = await reinstateApiKey(id, admin.email);
  if (!record) throw new ActionError(GONE);
  return null;
});

export const deleteApiKeyAction = adminAction(idSchema, async ({ id }, admin) => {
  const record = await deleteRevokedApiKey(id, admin.email);
  if (!record) throw new ActionError('Only revoked keys can be deleted.');
  return null;
});
