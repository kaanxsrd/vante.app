import { z } from 'zod';

export const assetUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
    message: 'Must be a URL or a path starting with /',
  })
  .refine((value) => !value.startsWith('//'), {
    message: 'Protocol-relative URLs are not allowed',
  });

export const optionalAssetUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || assetUrlSchema.safeParse(value).success,
    'Must be a URL or a path starting with /',
  );

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .regex(/^https?:\/\//i, 'Must start with http:// or https://');

function nullIfEmpty(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? null : value;
}

export function nullable<T extends z.ZodType>(schema: T) {
  return z.preprocess(nullIfEmpty, schema.nullable());
}

export const tagListSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(30)
  .transform((tags) => [...new Set(tags)]);

export const idSchema = z.object({ id: z.uuid() });

export function patchSchema<Schema extends z.ZodObject>(schema: Schema) {
  const fields = Object.entries(schema.shape).map(([key, field]) => {
    const inner = field instanceof z.ZodDefault ? field.unwrap() : field;
    return [key, (inner as z.ZodType).optional()];
  });
  return z.object(Object.fromEntries(fields)) as unknown as z.ZodType<Partial<z.output<Schema>>>;
}

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };
