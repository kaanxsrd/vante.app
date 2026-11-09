import { describe, expect, test } from 'bun:test';
import {
  countCatalogIcons,
  resolveIcon,
  resolveIcons,
  searchIcons,
  suggestIcon,
  themedColors,
} from '@/features/icons/catalog';
import { POPULAR_ICONS } from '@/features/icons/popular';
import { iconIdSchema, legacyIconNames } from '@/features/icons/schema';
import { DEFAULT_ICONS } from '@/features/icons/types';

const search = (query: string, set: 'all' | 'lucide' = 'all') =>
  searchIcons({ query, set, purpose: 'tech', offset: 0 });

describe('iconIdSchema', () => {
  test('translates names saved before the library existed', () => {
    expect(iconIdSchema.parse('nextjs')).toBe('simple-icons:nextdotjs');
    expect(iconIdSchema.parse('email')).toBe('lucide:mail');
  });

  test('every old name points at a real icon', async () => {
    for (const name of legacyIconNames()) {
      const id = iconIdSchema.parse(name) as string;
      expect(await resolveIcon(id), name).not.toBeNull();
    }
  });

  test.each(['nope', '', 'a b:c', '<script>:x', 'lucide:<img>', 'constructor'])(
    'refuses %p',
    (value) => {
      expect(iconIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('catalog', () => {
  test('holds thousands of icons', async () => {
    expect(await countCatalogIcons()).toBeGreaterThan(9000);
  });

  test('everything offered by default exists', async () => {
    const ids = [...Object.values(POPULAR_ICONS).flat(), ...Object.values(DEFAULT_ICONS)];
    const known = await resolveIcons(ids);
    expect(ids.filter((id) => !known[id])).toEqual([]);
  });

  test('unknown or inherited names resolve to nothing', async () => {
    for (const id of [
      'lucide:nope-nope',
      'lucide:constructor',
      'lucide:__proto__',
      'nope:house',
      '__proto__:house',
      'lucide',
      'lucide:house:extra',
    ]) {
      expect(await resolveIcon(id), id).toBeNull();
    }
  });

  test('artwork contains no script', async () => {
    const { items } = await searchIcons({ query: 'a', set: 'logos', purpose: 'tech', offset: 0 });
    for (const { data } of items) expect(data.body).not.toMatch(/<script|\son\w+=|javascript:/i);
  });

  test('gradient ids are unique to each icon', async () => {
    const data = await resolveIcon('logos:firefox');
    const other = await resolveIcon('logos:chrome');
    const ids = (body = '') => [...body.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids(data?.body).length).toBeGreaterThan(0);
    expect(ids(data?.body).some((id) => ids(other?.body).includes(id))).toBe(false);
    for (const [, target] of (data?.body ?? '').matchAll(/url\(#([^)]+)\)/g)) {
      expect(ids(data?.body)).toContain(target);
    }
  });
});

describe('searchIcons', () => {
  test('finds names however they are typed', async () => {
    expect((await search('c++')).items[0]?.id).toBe('simple-icons:cplusplus');
    expect((await search('nextjs')).items[0]?.id).toBe('simple-icons:nextdotjs');
    expect((await search('Next.js')).items[0]?.id).toBe('simple-icons:nextdotjs');
  });

  test('covers the brands one library is missing', async () => {
    for (const query of ['linkedin', 'java', 'azure', 'visual studio code']) {
      expect((await search(query)).total, query).toBeGreaterThan(0);
    }
  });

  test('a library can be browsed without a search', async () => {
    const { items, total } = await search('', 'lucide');
    expect(total).toBeGreaterThan(2000);
    expect(items.length).toBe(96);
  });

  test('pages do not overlap', async () => {
    const first = await searchIcons({ query: '', set: 'lucide', purpose: 'tech', offset: 0 });
    const second = await searchIcons({ query: '', set: 'lucide', purpose: 'tech', offset: 96 });
    const seen = new Set(first.items.map((item) => item.id));
    expect(second.items.some((item) => seen.has(item.id))).toBe(false);
  });

  test('nothing matches nonsense', async () => {
    expect((await search('zzzqqqzzz')).total).toBe(0);
  });
});

describe('suggestIcon', () => {
  test('only accepts an exact name', async () => {
    expect((await suggestIcon('Kotlin'))?.id).toBe('simple-icons:kotlin');
    expect(await suggestIcon('Definitely Not A Brand')).toBeNull();
    expect(await suggestIcon('   ')).toBeNull();
  });
});

describe('themedColors', () => {
  test('near-black brands follow the text color on dark pages', () => {
    expect(themedColors('000000').dark).toBeUndefined();
    expect(themedColors('000000').light).toBe('#000000');
  });

  test('white brands follow the text color on light pages', () => {
    expect(themedColors('FFFFFF').light).toBeUndefined();
    expect(themedColors('FFFFFF').dark).toBe('#FFFFFF');
  });
});
