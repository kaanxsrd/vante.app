import 'server-only';
import { getIconData, iconToSVG } from '@iconify/utils';
import type { SimpleIcon } from 'simple-icons';
import { POPULAR_ICONS } from './popular';
import {
  ICON_SETS,
  type IconData,
  type IconMap,
  type IconPurpose,
  type IconResult,
  type IconSetId,
} from './types';

type IconifySet = Parameters<typeof getIconData>[0];

interface CatalogEntry {
  id: string;
  title: string;
  slug: string;
  key: string;
  words: string[];
}

interface LoadedSet {
  entries: CatalogEntry[];
  resolve: (name: string) => IconData | null;
}

export const ICON_PAGE_SIZE = 96;

const ICONIFY_LOADERS: Record<Exclude<IconSetId, 'simple-icons'>, () => Promise<IconifySet>> = {
  logos: async () => (await import('@iconify-json/logos')).icons,
  devicon: async () => (await import('@iconify-json/devicon')).icons,
  'skill-icons': async () => (await import('@iconify-json/skill-icons')).icons,
  'fa6-brands': async () => (await import('@iconify-json/fa6-brands')).icons,
  lucide: async () => (await import('@iconify-json/lucide')).icons,
};

const SET_IDS = new Set<string>(ICON_SETS.map((set) => set.id));
const isIconSet = (value: string | undefined): value is IconSetId =>
  value !== undefined && SET_IDS.has(value);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]/g, '');
}

function entryFor(set: IconSetId, slug: string, title: string): CatalogEntry {
  return {
    id: `${set}:${slug}`,
    title,
    slug: normalize(slug),
    key: normalize(title),
    words: title
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter(Boolean)
      .map(normalize),
  };
}

function humanize(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function themedColors(hex: string): Pick<IconData, 'light' | 'dark'> {
  const color = `#${hex}`;
  const level = luminance(hex);
  return {
    ...(level > 0.9
      ? {}
      : { light: level > 0.4 ? `color-mix(in oklab, ${color} 74%, black)` : color }),
    ...(level < 0.02
      ? {}
      : {
          dark:
            level < 0.25
              ? `color-mix(in oklab, ${color} ${level < 0.14 ? 60 : 84}%, white)`
              : color,
        }),
  };
}

function namespaceIds(body: string, prefix: string): string {
  let result = body;
  for (const [, id] of body.matchAll(/\sid="([^"]+)"/g)) {
    result = result
      .replaceAll(`id="${id}"`, `id="${prefix}${id}"`)
      .replaceAll(`#${id})`, `#${prefix}${id})`)
      .replaceAll(`"#${id}"`, `"#${prefix}${id}"`);
  }
  return result;
}

async function loadSimpleIcons(): Promise<LoadedSet> {
  const icons = Object.values(await import('simple-icons')).filter(
    (item): item is SimpleIcon => 'slug' in item,
  );
  const bySlug = new Map(icons.map((icon) => [icon.slug, icon]));
  return {
    entries: icons
      .map((icon) => entryFor('simple-icons', icon.slug, icon.title))
      .sort((a, b) => a.title.localeCompare(b.title)),
    resolve: (name) => {
      const icon = bySlug.get(name);
      if (!icon) return null;
      return {
        body: `<path fill="currentColor" d="${icon.path}"/>`,
        viewBox: '0 0 24 24',
        ...themedColors(icon.hex),
      };
    },
  };
}

async function loadIconifySet(set: Exclude<IconSetId, 'simple-icons'>): Promise<LoadedSet> {
  const json = await ICONIFY_LOADERS[set]();
  return {
    entries: Object.keys(json.icons)
      .sort()
      .map((name) => entryFor(set, name, humanize(name))),
    resolve: (name) => {
      const known = Object.hasOwn(json.icons, name) || Object.hasOwn(json.aliases ?? {}, name);
      const icon = known ? getIconData(json, name) : null;
      if (!icon) return null;
      const { attributes, body } = iconToSVG(icon);
      return {
        body: namespaceIds(body, `${set}-${name}-`),
        viewBox: attributes.viewBox,
      };
    },
  };
}

const loaded = new Map<IconSetId, Promise<LoadedSet>>();

function loadSet(set: IconSetId): Promise<LoadedSet> {
  let pending = loaded.get(set);
  if (!pending) {
    pending = set === 'simple-icons' ? loadSimpleIcons() : loadIconifySet(set);
    loaded.set(set, pending);
  }
  return pending;
}

function parseId(id: string): { set: IconSetId; name: string } | null {
  const [set, name, extra] = id.split(':');
  return isIconSet(set) && name && extra === undefined ? { set, name } : null;
}

export async function resolveIcon(id: string): Promise<IconData | null> {
  const parsed = parseId(id);
  return parsed ? (await loadSet(parsed.set)).resolve(parsed.name) : null;
}

export async function resolveIcons(ids: string[]): Promise<IconMap> {
  const map: IconMap = {};
  for (const id of new Set(ids)) {
    const data = await resolveIcon(id);
    if (data) map[id] = data;
  }
  return map;
}

function matchScore(entry: CatalogEntry, query: string): number {
  if (entry.key === query || entry.slug === query) return 0;
  if (entry.key.startsWith(query) || entry.slug.startsWith(query)) return 1;
  if (entry.words.some((word) => word.startsWith(query))) return 2;
  if (entry.key.includes(query) || entry.slug.includes(query)) return 3;
  return -1;
}

async function toResults(entries: CatalogEntry[]): Promise<IconResult[]> {
  const results: IconResult[] = [];
  for (const { id, title } of entries) {
    const data = await resolveIcon(id);
    if (data) results.push({ id, title, data });
  }
  return results;
}

async function popularEntries(purpose: IconPurpose): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  for (const id of POPULAR_ICONS[purpose]) {
    const parsed = parseId(id);
    if (!parsed) continue;
    const entry = (await loadSet(parsed.set)).entries.find((item) => item.id === id);
    if (entry) entries.push(entry);
  }
  return entries;
}

export interface IconSearch {
  query: string;
  set: IconSetId | 'all';
  purpose: IconPurpose;
  offset: number;
}

export async function searchIcons({ query, set, purpose, offset }: IconSearch) {
  const needle = normalize(query);
  const sets = set === 'all' ? ICON_SETS.map((item) => item.id) : [set];

  let matches: CatalogEntry[];
  if (needle) {
    const scored: { entry: CatalogEntry; score: number; order: number }[] = [];
    for (const [order, id] of sets.entries()) {
      for (const entry of (await loadSet(id)).entries) {
        const score = matchScore(entry, needle);
        if (score >= 0) scored.push({ entry, score, order });
      }
    }
    scored.sort(
      (a, b) =>
        a.score - b.score || a.order - b.order || a.entry.title.length - b.entry.title.length,
    );
    matches = scored.map((item) => item.entry);
  } else if (set === 'all') {
    matches = await popularEntries(purpose);
  } else {
    matches = (await loadSet(set)).entries;
  }

  return {
    items: await toResults(matches.slice(offset, offset + ICON_PAGE_SIZE)),
    total: matches.length,
  };
}

export async function suggestIcon(name: string): Promise<IconResult | null> {
  const needle = normalize(name);
  if (!needle) return null;
  for (const { id: set } of ICON_SETS) {
    const entry = (await loadSet(set)).entries.find(
      (item) => item.key === needle || item.slug === needle,
    );
    if (entry) return (await toResults([entry]))[0] ?? null;
  }
  return null;
}

export async function countCatalogIcons(): Promise<number> {
  let total = 0;
  for (const { id } of ICON_SETS) total += (await loadSet(id)).entries.length;
  return total;
}
