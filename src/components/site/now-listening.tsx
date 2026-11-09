'use client';

import { ContentImage } from '@/components/site/content-image';
import { Equalizer } from '@/components/site/equalizer';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLatestTrack } from '@/features/music/use-latest-track';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const TITLE_CLASS = 'block truncate text-base font-semibold tracking-tight text-foreground';

export function NowListening({
  className,
  labels,
}: {
  className?: string;
  labels: { nowPlaying: string; lastPlayed: string };
}) {
  const track = useLatestTrack();
  if (!track) return null;

  const status = track.nowPlaying ? labels.nowPlaying : labels.lastPlayed;

  return (
    <div className={cn('relative', className)}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${status}: ${track.name}`}
            className="relative flex cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 p-1 shadow-sm dark:bg-muted/15">
              {track.nowPlaying ? (
                <Equalizer />
              ) : (
                <span className="h-0.5 w-4 rounded-full bg-muted-foreground/50" />
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="end"
          className="w-80 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur"
        >
          <div className="flex items-center gap-3">
            {track.image ? (
              <ContentImage
                src={track.image}
                alt=""
                width={72}
                height={72}
                className="size-18 shrink-0 rounded-lg object-cover shadow-md"
              />
            ) : (
              <span className="size-18 shrink-0 rounded-lg bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                {status}
                {!track.nowPlaying &&
                  track.playedAt &&
                  ` · ${formatRelativeTime(new Date(track.playedAt))}`}
              </p>
              {track.url ? (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(TITLE_CLASS, 'mt-0.5 hover:underline')}
                >
                  {track.name}
                </a>
              ) : (
                <span className={cn(TITLE_CLASS, 'mt-0.5')}>{track.name}</span>
              )}
              <span className="block truncate text-sm text-muted-foreground">{track.artist}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
