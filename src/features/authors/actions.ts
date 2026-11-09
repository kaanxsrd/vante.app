'use server';

import { z } from 'zod';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { idSchema } from '@/lib/validation';
import { authorInputSchema } from './schema';
import { AuthorConflictError, createAuthor, deleteAuthor, updateAuthor } from './service';

function asActionError(error: unknown): never {
  if (error instanceof AuthorConflictError) throw new ActionError(error.message);
  throw error;
}

export const createAuthorAction = adminAction(authorInputSchema, async (input, admin) => {
  await createAuthor(input, admin.email).catch(asActionError);
  revalidatePublicContent();
  return null;
});

export const updateAuthorAction = adminAction(
  z.object({ id: z.uuid(), input: authorInputSchema }),
  async ({ id, input }, admin) => {
    const author = await updateAuthor(id, input, admin.email).catch(asActionError);
    if (!author) throw new ActionError('That author no longer exists.');
    revalidatePublicContent();
    return null;
  },
);

export const deleteAuthorAction = adminAction(idSchema, async ({ id }, admin) => {
  const author = await deleteAuthor(id, admin.email);
  if (!author) throw new ActionError('That author no longer exists.');
  revalidatePublicContent();
  return null;
});
