import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];
export type ArtShape = 'ring' | 'orbs' | 'bars';

export interface ArtOptions {
  width: number;
  height: number;
  from: string;
  to: string;
  glow: string;
  shape: ArtShape;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPE_RGB = 2;
const FILTER_UP = 2;
const CHANNELS = 3;
const GRID_SPACING = 28;

function toRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const mix = (a: Rgb, b: Rgb, amount: number): Rgb => [
  a[0] + (b[0] - a[0]) * amount,
  a[1] + (b[1] - a[1]) * amount,
  a[2] + (b[2] - a[2]) * amount,
];

const WHITE: Rgb = [255, 255, 255];

function softCircle(x: number, y: number, cx: number, cy: number, radius: number): number {
  const distance = Math.hypot(x - cx, y - cy) / radius;
  return distance >= 1 ? 0 : (1 - distance) ** 2;
}

function solidCircle(x: number, y: number, cx: number, cy: number, radius: number): number {
  return Math.max(0, Math.min(1, radius - Math.hypot(x - cx, y - cy)));
}

function shapeCover(shape: ArtShape, x: number, y: number, width: number, height: number): number {
  const unit = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;

  if (shape === 'ring') {
    const outer = solidCircle(x, y, cx, cy, unit * 0.3);
    const inner = solidCircle(x, y, cx, cy, unit * 0.21);
    return (outer - inner) * 0.34;
  }
  if (shape === 'orbs') {
    const left = solidCircle(x, y, cx - unit * 0.12, cy, unit * 0.22) * 0.24;
    const right = solidCircle(x, y, cx + unit * 0.12, cy, unit * 0.22) * 0.24;
    return Math.min(0.5, left + right);
  }

  const bars = [0.42, 0.72, 0.56, 0.9, 0.64];
  const barWidth = unit * 0.075;
  const gap = unit * 0.05;
  const total = bars.length * barWidth + (bars.length - 1) * gap;
  const start = cx - total / 2;
  const base = cy + unit * 0.24;
  const index = Math.floor((x - start) / (barWidth + gap));
  const bar = bars[index];
  if (bar === undefined || x - start - index * (barWidth + gap) > barWidth) return 0;
  return y <= base && y >= base - unit * 0.48 * bar ? 0.3 : 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(Bun.hash.crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

export function renderArt({ width, height, from, to, glow, shape }: ArtOptions): Buffer {
  const start = toRgb(from);
  const end = toRgb(to);
  const light = toRgb(glow);
  const stride = width * CHANNELS;
  const scanlines = Buffer.alloc((stride + 1) * height);
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const line = Buffer.alloc(stride);
    for (let x = 0; x < width; x += 1) {
      let color = mix(start, end, (x / width + y / height) / 2);
      color = mix(color, light, softCircle(x, y, width * 0.78, height * 0.2, width * 0.75) * 0.75);
      color = mix(color, light, softCircle(x, y, width * 0.12, height * 0.95, width * 0.55) * 0.35);
      if (x % GRID_SPACING < 2 && y % GRID_SPACING < 2) color = mix(color, WHITE, 0.06);
      color = mix(color, WHITE, shapeCover(shape, x, y, width, height));
      line[x * CHANNELS] = Math.round(color[0]);
      line[x * CHANNELS + 1] = Math.round(color[1]);
      line[x * CHANNELS + 2] = Math.round(color[2]);
    }

    const offset = y * (stride + 1);
    scanlines[offset] = FILTER_UP;
    for (let i = 0; i < stride; i += 1) {
      scanlines[offset + 1 + i] = ((line[i] ?? 0) - (previous[i] ?? 0)) & 255;
    }
    previous = line;
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = COLOR_TYPE_RGB;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
