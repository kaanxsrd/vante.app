import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { COPY_GROUPS, type CopyField, type CopyKey } from '@/features/copy/fields';
import { DEFAULT_PIN, formatPinPosition, parsePinPosition, pinFrom } from '@/features/copy/pin';
import { copySchema, DEFAULT_COPY } from '@/features/copy/schema';
import { DEFAULT_PROFILE, isSafeLinkUrl, profileSchema } from '@/features/profile/schema';
import { SETTINGS_DEFAULTS } from '@/features/settings/schema';
import { patchSchema } from '@/lib/validation';

const PROFILE = { ...DEFAULT_PROFILE, name: 'Someone', title: 'Engineer' };

describe('profileSchema', () => {
  test('accepts a complete profile', () => {
    expect(profileSchema.safeParse(PROFILE).success).toBe(true);
  });

  test('the code holds no personal defaults', () => {
    expect(DEFAULT_PROFILE.name).toBe('');
    expect(DEFAULT_PROFILE.skills).toEqual([]);
    expect(DEFAULT_PROFILE.socials).toEqual([]);
    expect(DEFAULT_PROFILE.navigation).toEqual([]);
  });

  test('images can be empty, a path or a URL, but nothing else', () => {
    for (const avatar of ['', '/media/abc', 'https://example.com/a.png']) {
      expect(profileSchema.safeParse({ ...PROFILE, avatar }).success).toBe(true);
    }
    for (const avatar of ['javascript:alert(1)', '//evil.example/a.png', 'a.png']) {
      expect(profileSchema.safeParse({ ...PROFILE, avatar }).success).toBe(false);
    }
  });

  test('menu items need a safe link and cannot repeat', () => {
    const item = { label: 'Blog', href: '/blog', icon: 'notebook' };
    expect(profileSchema.safeParse({ ...PROFILE, navigation: [item] }).success).toBe(true);
    expect(
      profileSchema.safeParse({ ...PROFILE, navigation: [{ ...item, href: 'javascript:x' }] })
        .success,
    ).toBe(false);
    expect(profileSchema.safeParse({ ...PROFILE, navigation: [item, item] }).success).toBe(false);
  });

  test('the defaults are registered as a setting', () => {
    expect(SETTINGS_DEFAULTS.profile).toBe(DEFAULT_PROFILE);
  });

  test('requires a name and title', () => {
    expect(profileSchema.safeParse({ ...PROFILE, name: '  ' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...PROFILE, title: '' }).success).toBe(false);
  });

  test('allows empty sections', () => {
    const empty = { ...PROFILE, intro: '', about: '', skills: [], socials: [] };
    expect(profileSchema.safeParse(empty).success).toBe(true);
  });

  test('refuses an unknown icon', () => {
    const skills = [{ name: 'X', icon: 'not-an-icon' }];
    expect(profileSchema.safeParse({ ...PROFILE, skills }).success).toBe(false);
  });

  test('refuses duplicates regardless of case', () => {
    const skills = [
      { name: 'Rust', icon: 'rust' },
      { name: 'rust', icon: 'rust' },
    ];
    const result = profileSchema.safeParse({ ...PROFILE, skills });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('listed twice');
  });

  test('refuses a dangerous social link', () => {
    const socials = [{ name: 'Bad', url: 'javascript:alert(1)', icon: 'globe' }];
    expect(profileSchema.safeParse({ ...PROFILE, socials }).success).toBe(false);
  });
});

describe('isSafeLinkUrl', () => {
  test.each([
    'https://github.com/x',
    'http://example.com',
    'mailto:me@example.com',
    '/contact',
    '/',
  ])('accepts %s', (url) => {
    expect(isSafeLinkUrl(url)).toBe(true);
  });

  test.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'data:text/html,x',
    '//evil.example',
    '/\\evil.example',
    'github.com/x',
    'https://',
    '',
  ])('refuses %p', (url) => {
    expect(isSafeLinkUrl(url)).toBe(false);
  });
});

describe('copySchema', () => {
  test('every field starts from its own default and the defaults are valid', () => {
    const keys = COPY_GROUPS.flatMap((group) => group.fields.map((field) => field.key));
    expect(Object.keys(DEFAULT_COPY).sort()).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    const fields: CopyField[] = COPY_GROUPS.flatMap((group) => [...group.fields]);
    for (const field of fields) {
      expect(DEFAULT_COPY[field.key as CopyKey]).toBe(field.fallback ?? '');
    }
    expect(copySchema.safeParse(DEFAULT_COPY).success).toBe(true);
  });

  test('refuses a map image that is not a URL or path', () => {
    const copy = { ...DEFAULT_COPY, 'contact.mapImage': 'javascript:alert(1)' };
    expect(copySchema.safeParse(copy).success).toBe(false);
  });

  test('refuses text over the limit', () => {
    const copy = { ...DEFAULT_COPY, 'home.todayHeading': 'x'.repeat(301) };
    expect(copySchema.safeParse(copy).success).toBe(false);
  });
});

describe('map dot location', () => {
  test('reads a saved position', () => {
    expect(parsePinPosition('51.54,16.76')).toEqual({ x: 51.54, y: 16.76 });
    expect(pinFrom('10,90')).toEqual({ x: 10, y: 90 });
  });

  test('uses the default until a place is saved', () => {
    expect(pinFrom('')).toEqual(DEFAULT_PIN);
    expect(pinFrom('nonsense')).toEqual(DEFAULT_PIN);
  });

  test.each(['101,5', '5,101', '-1,5', 'a,b', '1;2', '1,2,3', '<b>,1', '1.234,5'])(
    'refuses %p',
    (value) => {
      expect(parsePinPosition(value)).toBeNull();
      expect(copySchema.safeParse({ ...DEFAULT_COPY, 'contact.pinPosition': value }).success).toBe(
        false,
      );
    },
  );

  test('a blank location is allowed', () => {
    expect(copySchema.safeParse({ ...DEFAULT_COPY, 'contact.pinPosition': '' }).success).toBe(true);
  });

  test('formats clicks to two decimals and keeps them on the map', () => {
    expect(formatPinPosition({ x: 12.3456, y: 99.999 })).toBe('12.35,100.00');
    expect(formatPinPosition({ x: -4, y: 104 })).toBe('0.00,100.00');
    expect(parsePinPosition(formatPinPosition({ x: 12.3456, y: 50 }))).toEqual({ x: 12.35, y: 50 });
  });
});

describe('patchSchema', () => {
  const schema = z.object({
    title: z.string(),
    tags: z.array(z.string()).default([]),
    status: z.string().default('draft'),
  });

  test('leaves out fields the caller did not send', () => {
    expect(patchSchema(schema).parse({ title: 'x' })).toEqual({ title: 'x' });
  });

  test('still validates the fields that were sent', () => {
    expect(patchSchema(schema).safeParse({ tags: 'nope' }).success).toBe(false);
  });
});
