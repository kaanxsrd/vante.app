import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getImage } from '@/features/media/service';

const publicFile = (...segments: string[]) => join(process.cwd(), 'public', ...segments);

const DRAWABLE = /^image\/(png|jpeg|gif)$/;

function toDataUrl(contentType: string, bytes: Uint8Array): string | null {
  if (!DRAWABLE.test(contentType)) return null;
  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
}

export async function imageDataUrl(location: string | null | undefined): Promise<string | null> {
  if (!location) return null;
  try {
    const mediaId = /^\/media\/([0-9a-f-]{36})$/.exec(location)?.[1];
    if (mediaId) {
      const image = await getImage(mediaId);
      return image ? toDataUrl(image.contentType, image.data) : null;
    }
    if (/^https?:\/\//i.test(location)) {
      const response = await fetch(location, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type')?.split(';')[0] ?? '';
      return toDataUrl(contentType, new Uint8Array(await response.arrayBuffer()));
    }
  } catch {}
  return null;
}

export async function loadOgFonts() {
  const [clashDisplay, cabinetGrotesk] = await Promise.all([
    readFile(publicFile('fonts', 'ClashDisplay-Semibold.ttf')),
    readFile(publicFile('fonts', 'CabinetGrotesk-Medium.ttf')),
  ]);
  return [
    { name: 'Clash Display', data: clashDisplay, weight: 500 as const, style: 'normal' as const },
    {
      name: 'Cabinet Grotesk',
      data: cabinetGrotesk,
      weight: 500 as const,
      style: 'normal' as const,
    },
  ];
}
