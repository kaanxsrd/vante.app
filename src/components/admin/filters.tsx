'use client';

import { RefreshCw, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const ALL = '__all';
const SEARCH_DEBOUNCE_MS = 300;

function useUpdateParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (changes: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in changes)) next.delete('page');
      const query = next.toString();
      const { pathname } = window.location;
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
    },
    [router, searchParams],
  );

  return { update, pending, searchParams };
}

export function SearchFilter({
  placeholder = 'Search',
  param = 'q',
  className,
}: {
  placeholder?: string;
  param?: string;
  className?: string;
}) {
  const { update, searchParams } = useUpdateParams();
  const [value, setValue] = useState(searchParams.get(param) ?? '');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className="pl-8"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(
            () => update({ [param]: next || undefined }),
            SEARCH_DEBOUNCE_MS,
          );
        }}
      />
    </div>
  );
}

export function SelectFilter({
  param,
  label,
  options,
}: {
  param: string;
  label: string;
  options: readonly { value: string; label: string }[];
}) {
  const { update, searchParams } = useUpdateParams();
  return (
    <Select
      value={searchParams.get(param) ?? ALL}
      onValueChange={(value) => update({ [param]: value === ALL ? undefined : value })}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: All</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TabFilter({
  param,
  options,
  fallback,
}: {
  param: string;
  options: readonly { value: string; label: string }[];
  fallback: string;
}) {
  const { update, searchParams } = useUpdateParams();
  const active = searchParams.get(param) ?? fallback;
  return (
    <div
      role="tablist"
      className="inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={active === option.value}
          onClick={() => update({ [param]: option.value === fallback ? undefined : option.value })}
          className={cn(
            'inline-flex h-7 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            active === option.value && 'bg-background text-foreground shadow-xs',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const RANGE_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export function RangeFilter({ fallback = '7d' }: { fallback?: string }) {
  const { update, searchParams } = useUpdateParams();
  const custom = Boolean(searchParams.get('from') && searchParams.get('to'));
  const active = custom ? 'custom' : (searchParams.get('range') ?? fallback);
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="tablist"
        aria-label="Date range"
        className="inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground"
      >
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active === option.value}
            onClick={() => update({ range: option.value, from: undefined, to: undefined })}
            className={cn(
              'inline-flex h-7 items-center whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active === option.value && 'bg-background text-foreground shadow-xs',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
        <Input
          type="date"
          aria-label="From date"
          className="h-9 min-w-0 flex-1 text-xs sm:w-[9.25rem] sm:flex-none"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="To date"
          className="h-9 min-w-0 flex-1 text-xs sm:w-[9.25rem] sm:flex-none"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={!from || !to || from > to}
          onClick={() => update({ from, to, range: undefined })}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

const LIVE_INTERVAL_MS = 15_000;

export function LiveRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    }, LIVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled, router]);

  return (
    <div className="flex items-center gap-2">
      <Switch id="live-refresh" checked={enabled} onCheckedChange={setEnabled} />
      <label htmlFor="live-refresh" className="text-xs text-muted-foreground">
        Live
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Refresh now"
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw className={cn('size-4', pending && 'animate-spin')} />
      </Button>
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
}) {
  const { update, pending } = useUpdateParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">{total} total</p>;
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || pending}
          onClick={() => update({ page: page > 2 ? String(page - 1) : undefined })}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages || pending}
          onClick={() => update({ page: String(page + 1) })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
