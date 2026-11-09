import type { PinPosition } from './pin';

export interface MapCountry {
  name: string;
  paths: string[];
}

export interface MapExtra extends PinPosition {
  name: string;
}

export interface WorldMap {
  viewBox: string;
  left: number;
  top: number;
  width: number;
  height: number;
  countries: MapCountry[];
  extras: MapExtra[];
}

const BUNDLED_MAP_VIEW_BOX = '0 0 2000 857';
const MIN_COUNTRIES = 20;

const BETTER_NAMES = new Map([
  ['Dem. Rep. Korea', 'North Korea'],
  ['Republic of Korea', 'South Korea'],
  ['Lao PDR', 'Laos'],
  ['Russian Federation', 'Russia'],
  ['Brunei Darussalam', 'Brunei'],
  ['Swaziland', 'Eswatini'],
  ['Macedonia', 'North Macedonia'],
  ['The Gambia', 'Gambia'],
]);

const TOO_SMALL_TO_DRAW: MapExtra[] = [
  { name: 'Andorra', x: 49.7, y: 26.71 },
  { name: 'Kiribati', x: 98.27, y: 57.46 },
  { name: 'Liechtenstein', x: 51.71, y: 23.33 },
  { name: 'Monaco', x: 51.14, y: 25.83 },
  { name: 'San Marino', x: 52.55, y: 25.67 },
  { name: 'Singapore', x: 78.74, y: 57.6 },
  { name: 'Vatican City', x: 52.55, y: 27.2 },
];

export function parseWorldMap(svgText: string): WorldMap | null {
  const document = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = document.documentElement;
  if (root.nodeName !== 'svg' || document.querySelector('parsererror')) return null;

  const viewBox = root.getAttribute('viewBox') ?? root.getAttribute('viewbox');
  const box =
    viewBox
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  const [left, top, width, height] = box;
  if (
    !viewBox ||
    left === undefined ||
    top === undefined ||
    !width ||
    !height ||
    box.some(Number.isNaN)
  ) {
    return null;
  }

  const shapes = new Map<string, string[]>();
  for (const path of root.querySelectorAll('path')) {
    const raw = path.getAttribute('name') ?? path.getAttribute('class');
    const d = path.getAttribute('d');
    if (!raw || !d) continue;
    const name = BETTER_NAMES.get(raw) ?? raw;
    shapes.set(name, [...(shapes.get(name) ?? []), d]);
  }
  if (shapes.size < MIN_COUNTRIES) return null;

  return {
    viewBox,
    left,
    top,
    width,
    height,
    countries: [...shapes].map(([name, paths]) => ({ name, paths })),
    extras: viewBox.trim() === BUNDLED_MAP_VIEW_BOX ? TOO_SMALL_TO_DRAW : [],
  };
}
