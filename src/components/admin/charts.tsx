'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

const SERIES_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

type Datum = { bucket: string } & Record<string, number | string>;

const HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const FULL_FORMAT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const formatMilliseconds = (value: number) => `${Math.round(value)}ms`;

function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: Partial<TooltipContentProps<number, string>> & { formatValue: (value: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 text-muted-foreground">
        {FULL_FORMAT.format(new Date(String(label)))} UTC
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="font-semibold tabular-nums">{formatValue(Number(entry.value))}</span>
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((item, index) => (
        <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: item.color ?? SERIES_COLORS[index] }}
            aria-hidden="true"
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

interface TrendChartProps {
  data: Datum[];
  series: ChartSeries[];
  bucket: 'hour' | 'day';
  height?: number;
  stacked?: boolean;
  unit?: 'count' | 'ms';
  summary: string;
}

export function TrendChart({
  data,
  series,
  bucket,
  height = 260,
  stacked,
  unit = 'count',
  summary,
}: TrendChartProps) {
  const formatValue = unit === 'ms' ? formatMilliseconds : formatNumber;
  const format = bucket === 'hour' ? HOUR_FORMAT : DAY_FORMAT;
  return (
    <figure aria-label={summary}>
      {series.length > 1 && <ChartLegend series={series} />}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="bucket"
            tickFormatter={(value: string) => format.format(new Date(value))}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={36}
          />
          <YAxis
            allowDecimals={false}
            width={44}
            tickFormatter={(value: number) => formatValue(value)}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={<ChartTooltip formatValue={formatValue} />}
            isAnimationActive={false}
          />
          {series.map((item, index) => {
            const color = item.color ?? SERIES_COLORS[index];
            return (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={0.1}
                stackId={stacked ? 'stack' : undefined}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

export function BarList({
  items,
  formatValue = formatNumber,
}: {
  items: BarListItem[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.key} className="group text-sm" title={item.detail}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-foreground/90">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-opacity group-hover:opacity-80"
              style={{
                width: `${Math.max((item.value / max) * 100, 1)}%`,
                backgroundColor: 'var(--chart-1)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface SegmentItem {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export function SegmentedBar({ items, className }: { items: SegmentItem[]; className?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;
  return (
    <div className={cn('space-y-3', className)}>
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label="Share by category"
      >
        {items.map((item, index) => (
          <div
            key={item.key}
            title={`${item.label}: ${formatNumber(item.value)}`}
            className="h-full transition-opacity hover:opacity-80"
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
            }}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{
                  backgroundColor: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
                }}
                aria-hidden="true"
              />
              <span className="truncate capitalize">{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(item.value)} · {((item.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
