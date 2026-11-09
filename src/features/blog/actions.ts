'use server';

import { z } from 'zod';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { MarkdownPreview } from '@/features/content/markdown';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { idSchema } from '@/lib/validation';
import { contentStatusSchema, postInputSchema } from './schema';
import {
  createPost,
  deletePost,
  PostConflictError,
  setPostStatus,
  UnknownAuthorError,
  updatePost,
} from './service';

function asActionError(error: unknown): never {
  if (error instanceof PostConflictError || error instanceof UnknownAuthorError) {
    throw new ActionError(error.message);
  }
  throw error;
}

export const createPostAction = adminAction(postInputSchema, async (input, admin) => {
  const post = await createPost(input, admin.email).catch(asActionError);
  revalidatePublicContent();
  return { id: post.id };
});

export const updatePostAction = adminAction(
  z.object({ id: z.uuid(), input: postInputSchema }),
  async ({ id, input }, admin) => {
    const post = await updatePost(id, input, admin.email).catch(asActionError);
    if (!post) throw new ActionError('That post no longer exists.');
    revalidatePublicContent();
    return { id: post.id };
  },
);

export const setPostStatusAction = adminAction(
  z.object({ id: z.uuid(), status: contentStatusSchema }),
  async ({ id, status }, admin) => {
    const post = await setPostStatus(id, status, admin.email);
    if (!post) throw new ActionError('That post no longer exists.');
    revalidatePublicContent();
    return { status: post.status };
  },
);

export const deletePostAction = adminAction(idSchema, async ({ id }, admin) => {
  const post = await deletePost(id, admin.email);
  if (!post) throw new ActionError('That post no longer exists.');
  revalidatePublicContent();
  return { id: post.id };
});

export const renderMarkdownPreviewAction = adminAction(
  z.object({ content: z.string().max(200_000) }),
  async ({ content }) => MarkdownPreview({ content }),
);
