import type { DayActivity } from '@/features/music/types';
import { cn, stagger } from '@/lib/utils';

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' });
const FULL_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const NUMBER = new Intl.NumberFormat('en-US');

const dayDate = (day: string) => new Date(`${day}T00:00:00Z`);

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function ActivityChart({
  days,
  labels,
}: {
  days: DayActivity[];
  labels: { heading: string; summary: string; plays: string };
}) {
  const total = days.reduce((sum, day) => sum + day.plays, 0);
  if (days.length === 0 || total === 0) return null;
  const peak = Math.max(...days.map((day) => day.plays));
  const average = Math.round(total / days.length);

  return (
    <section className="rounded-2xl border bg-card/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="title text-xl font-medium">{labels.heading}</h2>
        <p className="font-mono text-xs tracking-wide text-muted-foreground">
          {fill(labels.summary, {
            total: NUMBER.format(total),
            average: NUMBER.format(average),
          })}
        </p>
      </div>

      <div aria-hidden="true" className="mt-8 flex h-40 items-stretch gap-[2px]">
        {days.map((day, index) => {
          const isPeak = day.plays === peak;
          return (
            <div key={day.day} className="group relative flex flex-1 flex-col justify-end">
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-center text-[11px] whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
                <span className="block font-medium tabular-nums">
                  {NUMBER.format(day.plays)} {labels.plays}
                </span>
                <span className="block text-muted-foreground">
                  {FULL_DATE.format(dayDate(day.day))}
                </span>
              </span>
              {isPeak && (
                <span className="mb-1 text-center font-mono text-[11px] tabular-nums text-foreground/80">
                  {NUMBER.format(day.plays)}
                </span>
              )}
              <span
                className={cn(
                  'activity-bar mx-auto block w-full max-w-9 rounded-t-[4px] transition-colors duration-150',
                  isPeak ? 'bg-foreground' : 'bg-foreground/35 group-hover:bg-foreground/60',
                )}
                style={{
                  ...stagger(index),
                  height: `${Math.max((day.plays / peak) * 82, day.plays > 0 ? 2 : 0.5)}%`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-[2px] border-t pt-2">
        {days.map((day) => (
          <span
            key={day.day}
            className="flex-1 text-center font-mono text-[10px] text-muted-foreground"
          >
            {WEEKDAY.format(dayDate(day.day))}
          </span>
        ))}
      </div>

      <div className="sr-only">
        <table>
          <caption>{labels.heading}</caption>
          <tbody>
            {days.map((day) => (
              <tr key={day.day}>
                <th scope="row">{FULL_DATE.format(dayDate(day.day))}</th>
                <td>
                  {NUMBER.format(day.plays)} {labels.plays}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
