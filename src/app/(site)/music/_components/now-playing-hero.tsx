'use client';

import { ContentImage } from '@/components/site/content-image';
import { Equalizer } from '@/components/site/equalizer';
import { largeArt, type RecentTrack } from '@/features/music/types';
import { useLatestTrack } from '@/features/music/use-latest-track';
import { CoverArt } from './cover-art';
import { TimeAgo } from './time-ago';

export function NowPlayingHero({
  initial,
  renderedAt,
  labels,
}: {
  initial: RecentTrack;
  renderedAt: number;
  labels: { nowPlaying: string; lastPlayed: string };
}) {
  const track = useLatestTrack(initial) ?? initial;
  const art = largeArt(track.image);
  const title = track.url ? (
    <a
      href={track.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline-offset-8 hover:underline"
    >
      {track.name}
    </a>
  ) : (
    track.name
  );

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border bg-card/50">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {art && (
          <ContentImage
            key={art}
            src={art}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            className="scale-125 object-cover opacity-45 blur-3xl saturate-150 duration-700 animate-in fade-in-0 motion-reduce:animate-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/55 to-background/25" />
      </div>

      <div className="flex flex-col items-start gap-8 p-6 sm:flex-row sm:items-center sm:gap-14 sm:p-10">
        <div className="vinyl-stage" data-playing={track.nowPlaying}>
          <span aria-hidden="true" className="vinyl-disc">
            <CoverArt
              src={track.image}
              name={track.artist}
              sizes="96px"
              eager
              className="vinyl-label rounded-full"
            />
          </span>
          <CoverArt
            key={track.image ?? track.name}
            src={art}
            name={track.artist}
            sizes="(min-width: 640px) 224px, 60vw"
            eager
            className="relative z-10 size-full rounded-2xl text-6xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)] duration-500 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
          />
        </div>

        <div
          key={`${track.name}-${track.artist}`}
          className="min-w-0 flex-1 duration-500 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
        >
          <p className="flex items-center gap-2.5 font-mono text-xs tracking-wide text-foreground/70">
            {track.nowPlaying ? (
              <>
                <Equalizer />
                {labels.nowPlaying}
              </>
            ) : (
              <>
                {labels.lastPlayed}
                {track.playedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <TimeAgo at={track.playedAt} renderedAt={renderedAt} />
                  </>
                )}
              </>
            )}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-balance break-words sm:text-5xl">
            {title}
          </h2>
          <p className="mt-3 text-lg text-foreground/85">{track.artist}</p>
          {track.album && <p className="mt-0.5 text-sm text-foreground/60">{track.album}</p>}
        </div>
      </div>
    </section>
  );
}
