'use client';

import { Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AppIcon, iconVars } from '@/components/app-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { searchIconsAction } from '@/features/icons/actions';
import {
  ICON_SETS,
  type IconData,
  type IconPurpose,
  type IconResult,
  type IconSetId,
} from '@/features/icons/types';
import { cn } from '@/lib/utils';

type SetFilter = IconSetId | 'all';

const FILTERS: { id: SetFilter; label: string }[] = [{ id: 'all', label: 'All' }, ...ICON_SETS];

const SEARCH_DELAY_MS = 200;

function IconBrowser({
  value,
  purpose,
  onPick,
}: {
  value: string;
  purpose: IconPurpose;
  onPick: (item: IconResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [set, setSet] = useState<SetFilter>('all');
  const [items, setItems] = useState<IconResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    latest.current += 1;
    const request = latest.current;
    setLoading(true);

    const timer = setTimeout(
      async () => {
        try {
          const result = await searchIconsAction({ query, set, purpose, offset: 0 });
          if (request !== latest.current) return;
          if (result.ok) {
            setItems(result.data.items);
            setTotal(result.data.total);
            setError(null);
          } else {
            setError(result.error);
          }
        } catch {
          if (request === latest.current) setError('The icon library could not be reached.');
        } finally {
          if (request === latest.current) setLoading(false);
        }
      },
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [query, set, purpose]);

  async function loadMore() {
    const request = latest.current;
    setLoadingMore(true);
    try {
      const result = await searchIconsAction({ query, set, purpose, offset: items.length });
      if (request === latest.current && result.ok) {
        setItems((current) => [...current, ...result.data.items]);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const browsingPopular = !query && set === 'all';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          aria-label="Search icons"
          placeholder="Search nearly 10,000 icons, like rust, linkedin or camera"
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div role="tablist" aria-label="Icon library" className="flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={filter.id === set}
            onClick={() => setSet(filter.id)}
            className={cn(
              'h-7 shrink-0 rounded-md px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
              filter.id === set && 'bg-secondary text-foreground',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p role="status" className="text-xs text-muted-foreground">
        {loading
          ? 'Searching…'
          : browsingPopular
            ? 'Popular choices. Search, or open a library to see every icon.'
            : `${total.toLocaleString('en-US')} icons`}
      </p>

      <div className="min-h-64 flex-1 overflow-y-auto pr-1">
        {error ? (
          <p className="py-10 text-center text-sm text-critical-foreground">{error}</p>
        ) : !loading && items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing matches that. Try a shorter word.
          </p>
        ) : (
          <div
            className={cn(
              'grid grid-cols-4 gap-1.5 transition-opacity sm:grid-cols-6 md:grid-cols-8',
              loading && 'opacity-50',
            )}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                title={`${item.title} (${item.id.split(':')[0]})`}
                aria-label={item.title}
                aria-pressed={item.id === value}
                style={iconVars(item.data)}
                onClick={() => onPick(item)}
                className={cn(
                  'group flex h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-transparent p-1.5 outline-none transition-colors hover:border-border hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  item.id === value && 'border-ring bg-accent',
                )}
              >
                <AppIcon
                  data={item.data}
                  brand
                  className="size-7 shrink-0 transition-transform duration-200 group-hover:scale-110"
                />
                <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {!error && !loading && items.length < total && (
          <div className="flex justify-center py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore && <Loader2 className="animate-spin" />}
              Show more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function IconPicker({
  label,
  value,
  data,
  purpose,
  onChange,
}: {
  label: string;
  value: string;
  data: IconData | undefined;
  purpose: IconPurpose;
  onChange: (id: string, data: IconData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label={label}
          title="Change icon"
          style={iconVars(data)}
        >
          <AppIcon data={data} brand className="size-[18px]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[min(44rem,calc(100dvh-2rem))] max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose an icon</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        {open && (
          <IconBrowser
            value={value}
            purpose={purpose}
            onPick={(item) => {
              onChange(item.id, item.data);
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
