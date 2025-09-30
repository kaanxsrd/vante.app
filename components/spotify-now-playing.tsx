'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SpotifyData {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumImageUrl?: string | null;
  songUrl?: string | null;
  progressMs?: number;
  durationMs?: number;
}

interface SpotifyNowPlayingProps {
  className?: string;
  refreshInterval?: number;
}

const REFRESH_INTERVAL = 60_000;

const formatTime = (ms?: number) => {
  if (!ms || Number.isNaN(ms)) return '0:00';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function SpotifyNowPlaying({
  className,
  refreshInterval = REFRESH_INTERVAL,
}: SpotifyNowPlayingProps) {
  const [data, setData] = useState<SpotifyData | null>(null);
  const [tick, setTick] = useState(0);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify', {
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const json = (await response.json()) as SpotifyData;
      setData(json);
      setTick(0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNowPlaying();

    if (!refreshInterval) {
      return;
    }

    const interval = setInterval(fetchNowPlaying, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchNowPlaying, refreshInterval]);

  useEffect(() => {
    if (!data?.isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      setTick((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.isPlaying]);

  const progressMs = useMemo(() => {
    if (!data?.isPlaying) {
      return 0;
    }

    const base = data.progressMs ?? 0;
    return Math.min(base + tick * 1000, data.durationMs ?? Number.POSITIVE_INFINITY);
  }, [data?.durationMs, data?.isPlaying, data?.progressMs, tick]);

  const progressPercent = useMemo(() => {
    if (!data?.isPlaying || !data.durationMs || data.durationMs === 0) {
      return 0;
    }

    return Math.min(100, (progressMs / data.durationMs) * 100);
  }, [data?.durationMs, data?.isPlaying, progressMs]);

  const playingBars = [
    { min: 0.2, max: 0.9, delay: 0 },
    { min: 0.25, max: 1, delay: 0.12 },
    { min: 0.2, max: 0.95, delay: 0.24 },
    { min: 0.3, max: 0.85, delay: 0.36 },
  ];

  const playingIndicator = (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 p-1 shadow-sm dark:bg-muted/15">
      <div className="equalizer">
        {playingBars.map((bar, index) => (
          <span
            key={`playing-bar-${index}`}
            className="equalizer-bar"
            style={
              {
                animationDelay: `${bar.delay}s`,
                ['--eq-min' as const]: `${bar.min}`,
                ['--eq-max' as const]: `${bar.max}`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );

  const idleIndicator = (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 p-1 shadow-sm dark:bg-muted/15">
      <span className="h-0.5 w-4 rounded-full bg-muted-foreground/50" />
    </div>
  );

  const indicator = data?.isPlaying ? playingIndicator : idleIndicator;

  return (
    <div className={cn('relative', className)}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="relative flex cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={
              data?.isPlaying
                ? `Listening to ${data.title ?? 'Spotify'}`
                : 'Not listening on Spotify'
            }
          >
            {indicator}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="end"
          className="w-[22rem] rounded-2xl border border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur"
        >
          {data?.isPlaying ? (
            <div className="flex gap-4">
              {data.albumImageUrl ? (
                <Image
                  src={data.albumImageUrl}
                  alt={data.title ?? 'Album artwork'}
                  width={96}
                  height={96}
                  className="h-24 w-24 flex-shrink-0 rounded-lg object-cover shadow-md"
                />
              ) : (
                <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-muted" />
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="space-y-1">
                  {data.songUrl ? (
                    <Link
                      href={data.songUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 text-lg font-semibold tracking-tight text-foreground hover:underline dark:text-white"
                    >
                      {data.title}
                    </Link>
                  ) : (
                    <span className="line-clamp-1 text-lg font-semibold tracking-tight text-foreground dark:text-white">
                      {data.title}
                    </span>
                  )}
                  <span className="line-clamp-1 text-sm text-muted-foreground">{data.artist}</span>
                </div>
                <div className="space-y-2 pt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-300 dark:bg-muted/30">
                    <div
                      className="h-full rounded-full bg-black dark:bg-foreground transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(progressMs)}</span>
                    <span>{formatTime(data.durationMs)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Not listening to anything right now.
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
