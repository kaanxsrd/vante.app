'use server';

import { z } from 'zod';
import { adminAction } from '@/features/auth/create-action';
import { searchIcons, suggestIcon } from './catalog';
import { ICON_PURPOSES, ICON_SETS, type IconSetId } from './types';

const setIds = ICON_SETS.map((set) => set.id) as [IconSetId, ...IconSetId[]];

export const searchIconsAction = adminAction(
  z.object({
    query: z.string().trim().max(60),
    set: z.enum(['all', ...setIds]),
    purpose: z.enum(ICON_PURPOSES),
    offset: z.number().int().min(0).max(20_000),
  }),
  async (input) => searchIcons(input),
);

export const suggestIconAction = adminAction(
  z.object({ name: z.string().trim().max(60) }),
  async ({ name }) => suggestIcon(name),
);
