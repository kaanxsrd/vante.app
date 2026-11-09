const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
});

const RELATIVE_UNITS = [
  { label: 'y', ms: 31_536_000_000 },
  { label: 'mo', ms: 2_592_000_000 },
  { label: 'w', ms: 604_800_000 },
  { label: 'd', ms: 86_400_000 },
  { label: 'h', ms: 3_600_000 },
  { label: 'm', ms: 60_000 },
] as const;

export function formatDate(date: Date | string): string {
  return DATE_FORMAT.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return `${DATE_TIME_FORMAT.format(new Date(date))} UTC`;
}

export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(date).getTime();
  const absolute = Math.abs(diff);
  for (const unit of RELATIVE_UNITS) {
    const value = Math.floor(absolute / unit.ms);
    if (value >= 1) return diff >= 0 ? `${value}${unit.label} ago` : `in ${value}${unit.label}`;
  }
  return 'Just now';
}

const COMPACT_NUMBER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const FULL_NUMBER = new Intl.NumberFormat('en-US');

export function formatNumber(value: number): string {
  return Math.abs(value) >= 10_000 ? COMPACT_NUMBER.format(value) : FULL_NUMBER.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

const COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  try {
    return COUNTRY_NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}
