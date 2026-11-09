import { isIP } from 'node:net';
import { z } from 'zod';
import { API_SCOPE_NAMES } from './scopes';

const originSchema = z
  .string()
  .trim()
  .max(255)
  .regex(/^https?:\/\/[^/\s]+$/i, 'Use a full origin such as https://example.com')
  .transform((value) => value.toLowerCase());

const ipSchema = z
  .string()
  .trim()
  .refine((value) => isIP(value) !== 0, 'Enter a valid IP address');

const countrySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'Use a two-letter country code')
  .transform((value) => value.toUpperCase());

const keyPolicy = {
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(300).optional().default(''),
  scopes: z.array(z.enum(API_SCOPE_NAMES)).min(1, 'Choose at least one permission'),
  rateLimitPerMinute: z.number().int().min(1).max(10_000),
  dailyQuota: z.number().int().min(1).max(10_000_000).nullable(),
  allowedOrigins: z.array(originSchema).max(20).default([]),
  allowedIps: z.array(ipSchema).max(50).default([]),
  expectedCountries: z.array(countrySchema).max(50).default([]),
  expiresAt: z.coerce
    .date()
    .nullable()
    .refine((value) => value === null || value.getTime() > Date.now(), {
      message: 'Expiry must be in the future',
    }),
};

export const createApiKeySchema = z.object(keyPolicy);
export const updateApiKeySchema = z.object({ id: z.uuid(), ...keyPolicy });

export const rotateApiKeySchema = z.object({
  id: z.uuid(),
  graceHours: z.number().int().min(0).max(168),
});

export const revokeApiKeySchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().max(300).optional().default(''),
});

export const suspendApiKeySchema = z.object({
  id: z.uuid(),
  minutes: z.number().int().min(1).max(43_200),
  reason: z.string().trim().max(300).optional().default(''),
});

export type CreateApiKeyInput = z.output<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.output<typeof updateApiKeySchema>;
