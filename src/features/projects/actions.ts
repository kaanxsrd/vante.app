'use server';

import { z } from 'zod';
import { ActionError, adminAction } from '@/features/auth/create-action';
import { contentStatusSchema } from '@/features/blog/schema';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { idSchema } from '@/lib/validation';
import { projectInputSchema } from './schema';
import {
  createProject,
  deleteProject,
  moveProject,
  ProjectConflictError,
  setProjectStatus,
  updateProject,
} from './service';

function asActionError(error: unknown): never {
  if (error instanceof ProjectConflictError) throw new ActionError(error.message);
  throw error;
}

export const createProjectAction = adminAction(projectInputSchema, async (input, admin) => {
  const project = await createProject(input, admin.email).catch(asActionError);
  revalidatePublicContent();
  return { id: project.id };
});

export const updateProjectAction = adminAction(
  z.object({ id: z.uuid(), input: projectInputSchema }),
  async ({ id, input }, admin) => {
    const project = await updateProject(id, input, admin.email).catch(asActionError);
    if (!project) throw new ActionError('That project no longer exists.');
    revalidatePublicContent();
    return { id: project.id };
  },
);

export const setProjectStatusAction = adminAction(
  z.object({ id: z.uuid(), status: contentStatusSchema }),
  async ({ id, status }, admin) => {
    const project = await setProjectStatus(id, status, admin.email);
    if (!project) throw new ActionError('That project no longer exists.');
    revalidatePublicContent();
    return { status: project.status };
  },
);

export const deleteProjectAction = adminAction(idSchema, async ({ id }, admin) => {
  const project = await deleteProject(id, admin.email);
  if (!project) throw new ActionError('That project no longer exists.');
  revalidatePublicContent();
  return { id: project.id };
});

export const moveProjectAction = adminAction(
  z.object({ id: z.uuid(), direction: z.enum(['up', 'down']) }),
  async ({ id, direction }, admin) => {
    await moveProject(id, direction, admin.email);
    revalidatePublicContent();
    return null;
  },
);
