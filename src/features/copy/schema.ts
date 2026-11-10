import { z } from 'zod';
import { optionalAssetUrlSchema } from '@/lib/validation';
import {
  COPY_GROUPS,
  type CopyField,
  type CopyGroupId,
  type CopyKey,
  type SiteCopy,
} from './fields';
import { pinPositionSchema } from './pin';

const MAX_LENGTH = { text: 300, long: 2000, markdown: 50_000 } as const;

function fieldSchema({ kind = 'text', label }: CopyField): z.ZodType<string> {
  if (kind === 'image') return optionalAssetUrlSchema;
  if (kind === 'position') return pinPositionSchema;
  return z.string().trim().max(MAX_LENGTH[kind], `${label} is too long`);
}

const fields: CopyField[] = COPY_GROUPS.flatMap((group) => [...group.fields]);

export const copySchema = z.object(
  Object.fromEntries(fields.map((field) => [field.key, fieldSchema(field)])) as Record<
    CopyKey,
    z.ZodType<string>
  >,
);

export const DEFAULT_COPY = Object.fromEntries(
  fields.map(({ key, fallback }) => [key, fallback ?? '']),
) as SiteCopy;

export function isCopyGroupBlank(copy: SiteCopy, id: CopyGroupId): boolean {
  const groupFields: readonly CopyField[] =
    COPY_GROUPS.find((group) => group.id === id)?.fields ?? [];
  return groupFields.every(({ key }) => copy[key as CopyKey] === DEFAULT_COPY[key as CopyKey]);
}
