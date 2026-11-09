import { describe, expect, test } from 'bun:test';
import { COPY_GROUPS, type CopyField, type CopyKey } from '@/features/copy/fields';
import { copySchema, DEFAULT_COPY } from '@/features/copy/schema';
import { resolveIcons } from '@/features/icons/catalog';
import { profileSchema } from '@/features/profile/schema';
import { renderArt } from '../../scripts/seed-data/art';
import {
  AUTHOR_SLUG,
  STARTER_AUTHOR,
  STARTER_POSTS,
  STARTER_PROJECTS,
  starterCopy,
  starterProfile,
} from '../../scripts/seed-data/content';

const OPTIONAL_TEXT = new Set(['music.username', 'contact.pinPosition']);
const IMAGES = { avatar: '/media/a', logo: '/media/a', favicon: '/media/a' };

const profile = profileSchema.parse(starterProfile(IMAGES));
const copy = copySchema.parse({ ...DEFAULT_COPY, ...starterCopy('/media/map') });

describe('starter content', () => {
  test('every field on the site has starter text', () => {
    const fields: CopyField[] = COPY_GROUPS.flatMap((group) => [...group.fields]);
    const blank = fields
      .map((field) => field.key as CopyKey)
      .filter((key) => !OPTIONAL_TEXT.has(key) && copy[key] === '');
    expect(blank).toEqual([]);
  });

  test('every icon is in the library', async () => {
    const ids = [...profile.skills, ...profile.socials, ...profile.navigation].map((i) => i.icon);
    const known = await resolveIcons(ids);
    expect(ids.filter((id) => !known[id])).toEqual([]);
  });

  test('the landing page has something in every section', () => {
    expect(profile.name).not.toBe('');
    expect(profile.intro).not.toBe('');
    expect(profile.skills.length).toBeGreaterThan(0);
    expect(profile.navigation.length).toBeGreaterThan(0);
    expect(STARTER_POSTS.length).toBeGreaterThanOrEqual(2);
    expect(STARTER_PROJECTS.length).toBeGreaterThanOrEqual(2);
  });

  test('slugs are unique and the author matches', () => {
    expect(new Set(STARTER_POSTS.map((post) => post.slug)).size).toBe(STARTER_POSTS.length);
    expect(new Set(STARTER_PROJECTS.map((item) => item.slug)).size).toBe(STARTER_PROJECTS.length);
    expect(STARTER_AUTHOR.slug).toBe(AUTHOR_SLUG);
  });

  test('none of it belongs to a real person', () => {
    const all = JSON.stringify([profile, copy, STARTER_POSTS, STARTER_PROJECTS, STARTER_AUTHOR]);
    expect(all).not.toMatch(/kaan|karahanl|vante|kaanxsrd/i);
  });
});

describe('renderArt', () => {
  const png = renderArt({
    width: 40,
    height: 20,
    from: '#000000',
    to: '#ffffff',
    glow: '#ff0000',
    shape: 'ring',
  });

  test('produces a PNG of the requested size', () => {
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.toString('latin1', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(40);
    expect(png.readUInt32BE(20)).toBe(20);
  });

  test('ends with the image-end marker', () => {
    expect(png.toString('latin1', png.length - 8, png.length - 4)).toBe('IEND');
  });
});
