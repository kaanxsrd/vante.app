'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  MUSIC_PERIODS,
  type MusicPeriod,
  type MusicTopByPeriod,
  type TopAlbum,
  type TopArtist,
  type TopTrack,
} from '@/features/music/types';
import { cn, stagger } from '@/lib/utils';
import { CoverArt } from './cover-art';

const NUMBER = new Intl.NumberFormat('en-US');
const DEFAULT_PERIOD: MusicPeriod = '1month';
const LAST_TILE_INDEX = 11;

export interface TopChartLabels {
  heading: string;
  periods: Record<MusicPeriod, string>;
  artists: string;
  albums: string;
  tracks: string;
  plays: string;
  empty: string;
}

function OptionalLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function PeriodTabs({
  period,
  labels,
  onChange,
}: {
  period: MusicPeriod;
  labels: TopChartLabels;
  onChange: (next: MusicPeriod) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label={labels.heading}
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border bg-card/50 p-1"
    >
      {MUSIC_PERIODS.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === period}
          onClick={() => onChange(item)}
          className={cn(
            'relative h-8 shrink-0 rounded-full px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            item === period ? 'text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item === period && (
            <motion.span
              layoutId="music-period"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2 }}
            />
          )}
          <span className="relative">{labels.periods[item]}</span>
        </button>
      ))}
    </div>
  );
}

function ArtistList({ artists, playsLabel }: { artists: TopArtist[]; playsLabel: string }) {
  const most = artists[0]?.plays || 1;
  return (
    <ol className="space-y-4">
      {artists.map((artist, index) => (
        <li key={artist.name}>
          <OptionalLink href={artist.url} className="group flex items-center gap-3 outline-none">
            <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <CoverArt
              src={artist.image}
              name={artist.name}
              sizes="40px"
              className="size-10 rounded-full"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium underline-offset-4 group-hover:underline group-focus-visible:underline">
                  {artist.name}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {NUMBER.format(artist.plays)}
                  <span className="sr-only"> {playsLabel}</span>
                </span>
              </span>
              <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-muted">
                <span
                  className="artist-bar-fill block h-full rounded-full bg-foreground/70"
                  style={{ ...stagger(index), width: `${(artist.plays / most) * 100}%` }}
                />
              </span>
            </span>
          </OptionalLink>
        </li>
      ))}
    </ol>
  );
}

function AlbumMosaic({ albums, playsLabel }: { albums: TopAlbum[]; playsLabel: string }) {
  return (
    <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {albums.map((album, index) => (
        <li
          key={`${album.artist}-${album.name}`}
          style={stagger(index)}
          className={cn(
            'album-tile',
            index === 0 && 'col-span-2 row-span-2',
            index === LAST_TILE_INDEX && 'max-sm:hidden',
          )}
        >
          <OptionalLink
            href={album.url}
            className="group relative block aspect-square overflow-hidden rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CoverArt
              src={album.image}
              name={album.name}
              sizes={
                index === 0
                  ? '(min-width: 1024px) 40vw, 100vw'
                  : '(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw'
              }
              className="size-full text-4xl"
              eager={index === 0}
              imageClassName="transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] tabular-nums text-white backdrop-blur">
              {index + 1}
            </span>
            <span className="album-caption absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 pt-10 text-white">
              <span
                className={cn(
                  'block truncate font-medium',
                  index === 0 ? 'text-lg' : 'text-[13px]',
                )}
              >
                {album.name}
              </span>
              <span className="block truncate text-xs text-white/75">{album.artist}</span>
              <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-white/70">
                {NUMBER.format(album.plays)} {playsLabel}
              </span>
            </span>
          </OptionalLink>
        </li>
      ))}
    </ol>
  );
}

function TrackList({ tracks, playsLabel }: { tracks: TopTrack[]; playsLabel: string }) {
  return (
    <ol className="-mx-2">
      {tracks.map((track, index) => (
        <li key={`${track.artist}-${track.name}`}>
          <OptionalLink
            href={track.url}
            className="flex items-center gap-3 rounded-lg p-2 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
          >
            <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <CoverArt
              src={track.image}
              name={track.artist}
              sizes="40px"
              className="size-10 rounded-md"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{track.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{track.artist}</span>
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {NUMBER.format(track.plays)}
              <span className="sr-only"> {playsLabel}</span>
            </span>
          </OptionalLink>
        </li>
      ))}
    </ol>
  );
}

export function TopCharts({ top, labels }: { top: MusicTopByPeriod; labels: TopChartLabels }) {
  const [period, setPeriod] = useState<MusicPeriod>(DEFAULT_PERIOD);
  const { artists, albums, tracks } = top[period];
  const hasAnything = artists.length + albums.length + tracks.length > 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="title text-xl font-medium">{labels.heading}</h2>
        <PeriodTabs period={period} labels={labels} onChange={setPeriod} />
      </div>

      {hasAnything ? (
        <div key={period} className="space-y-6">
          {albums.length > 0 && (
            <div>
              <h3 className="title mb-3 text-base font-medium">{labels.albums}</h3>
              <AlbumMosaic albums={albums} playsLabel={labels.plays} />
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {artists.length > 0 && (
              <div className="rounded-2xl border bg-card/40 p-6">
                <h3 className="title mb-5 text-base font-medium">{labels.artists}</h3>
                <ArtistList artists={artists} playsLabel={labels.plays} />
              </div>
            )}
            {tracks.length > 0 && (
              <div className="rounded-2xl border bg-card/40 p-6">
                <h3 className="title mb-3 text-base font-medium">{labels.tracks}</h3>
                <TrackList tracks={tracks} playsLabel={labels.plays} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {labels.empty}
        </p>
      )}
    </section>
  );
}
