import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens');

const TURKISH_AND_NORDIC: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ç: 'c',
  ö: 'o',
  ü: 'u',
  æ: 'ae',
  ø: 'o',
  å: 'a',
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ışğçöüæøå]/g, (char) => TURKISH_AND_NORDIC[char] ?? char)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}
