export type RangePreset = '24h' | '7d' | '30d' | '90d';
export type Bucket = 'hour' | 'day';

export interface DateRange {
  preset: RangePreset | 'custom';
  from: Date;
  to: Date;
  bucket: Bucket;
  label: string;
}

const PRESETS: Record<RangePreset, { hours: number; label: string }> = {
  '24h': { hours: 24, label: 'Last 24 hours' },
  '7d': { hours: 24 * 7, label: 'Last 7 days' },
  '30d': { hours: 24 * 30, label: 'Last 30 days' },
  '90d': { hours: 24 * 90, label: 'Last 90 days' },
};

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MAX_CUSTOM_DAYS = 366;

function parseDay(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateRange(
  params: { range?: string; from?: string; to?: string },
  fallback: RangePreset = '7d',
  now: Date = new Date(),
): DateRange {
  const from = parseDay(params.from, false);
  const to = parseDay(params.to, true);
  if (from && to && from <= to && to.getTime() - from.getTime() <= MAX_CUSTOM_DAYS * DAY_MS) {
    return {
      preset: 'custom',
      from,
      to,
      bucket: to.getTime() - from.getTime() <= 2 * DAY_MS ? 'hour' : 'day',
      label: `${params.from} to ${params.to}`,
    };
  }

  const preset =
    params.range && Object.hasOwn(PRESETS, params.range) ? (params.range as RangePreset) : fallback;
  const { hours, label } = PRESETS[preset];
  return {
    preset,
    from: new Date(now.getTime() - hours * HOUR_MS),
    to: now,
    bucket: hours <= 48 ? 'hour' : 'day',
    label,
  };
}

export function bucketKey(date: Date, bucket: Bucket): string {
  const iso = date.toISOString();
  return bucket === 'hour' ? `${iso.slice(0, 13)}:00:00Z` : `${iso.slice(0, 10)}T00:00:00Z`;
}

export function listBuckets(range: Pick<DateRange, 'from' | 'to' | 'bucket'>): string[] {
  const step = range.bucket === 'hour' ? HOUR_MS : DAY_MS;
  const start = new Date(bucketKey(range.from, range.bucket)).getTime();
  const keys: string[] = [];
  for (let time = start; time <= range.to.getTime(); time += step) {
    keys.push(bucketKey(new Date(time), range.bucket));
  }
  return keys;
}

export function zeroFill<T extends { bucket: string }>(
  rows: T[],
  range: Pick<DateRange, 'from' | 'to' | 'bucket'>,
  empty: Omit<T, 'bucket'>,
): T[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  return listBuckets(range).map(
    (bucket) => byBucket.get(bucket) ?? ({ ...empty, bucket } as unknown as T),
  );
}
