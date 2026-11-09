import { Disc3, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import BlurFade from '@/components/magicui/blur-fade';
import { RevealGroup } from '@/components/magicui/reveal-group';
import { Equalizer } from '@/components/site/equalizer';
import { PageHeading } from '@/components/site/page-heading';
import type { SiteCopy } from '@/features/copy/fields';
import { getCopy } from '@/features/copy/queries';
import { getMusicOverview } from '@/features/music/queries';
import type { MusicOverview } from '@/features/music/types';
import { cn, stagger } from '@/lib/utils';
import { ActivityChart } from './_components/activity-chart';
import { CountUp } from './_components/count-up';
import { CoverArt } from './_components/cover-art';
import { NowPlayingHero } from './_components/now-playing-hero';
import { TimeAgo } from './_components/time-ago';
import { TopCharts } from './_components/top-charts';

export const revalidate = 300;

const AVERAGE_TRACK_MINUTES = 3.5;
const MS_PER_DAY = 86_400_000;

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy['music.metaTitle'], description: copy['music.metaDescription'] };
}

function Stats({ overview, copy }: { overview: MusicOverview; copy: SiteCopy }) {
  const { user, generatedAt } = overview;
  const days = user.since ? Math.max(1, Math.floor((generatedAt - user.since) / MS_PER_DAY)) : null;
  const stats = [
    { label: copy['music.statPlays'], value: user.plays, wide: true },
    { label: copy['music.statArtists'], value: user.artists },
    { label: copy['music.statAlbums'], value: user.albums },
    { label: copy['music.statTracks'], value: user.tracks },
    {
      label: copy['music.statHours'],
      value: Math.round((user.plays * AVERAGE_TRACK_MINUTES) / 60),
    },
    ...(days ? [{ label: copy['music.statDaily'], value: Math.round(user.plays / days) }] : []),
  ];

  return (
    <RevealGroup className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          style={stagger(index)}
          className={cn('rounded-2xl border bg-card/40 p-4', stat.wide && 'max-sm:col-span-2')}
        >
          <CountUp
            value={stat.value}
            className="block font-display text-2xl tabular-nums sm:text-3xl"
          />
          <span className="mt-1 block text-xs text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </RevealGroup>
  );
}

function RecentTracks({ overview, copy }: { overview: MusicOverview; copy: SiteCopy }) {
  const { recent, generatedAt } = overview;
  if (recent.length === 0) return null;

  return (
    <section>
      <h2 className="title mb-4 text-xl font-medium">{copy['music.recent']}</h2>
      <RevealGroup className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {recent.map((track, index) => (
          <div
            key={`${track.playedAt ?? 'now'}-${track.name}`}
            style={stagger(index)}
            className="flex items-center gap-3 border-b border-border/50 py-2.5"
          >
            <CoverArt
              src={track.image}
              name={track.artist}
              sizes="44px"
              className="size-11 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{track.name}</p>
              <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {track.nowPlaying ? (
                <Equalizer />
              ) : (
                track.playedAt && <TimeAgo at={track.playedAt} renderedAt={generatedAt} />
              )}
            </span>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}

export default async function MusicPage() {
  const copy = await getCopy();
  const username = copy['music.username'];
  const overview = username ? await getMusicOverview(username) : null;
  const hero = overview?.recent[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-12 pb-32 sm:pt-24">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <PageHeading title={copy['music.heading']} />
          {copy['music.description'] && (
            <p className="-mt-5 max-w-xl text-pretty text-muted-foreground md:pl-12">
              {copy['music.description']}
            </p>
          )}
        </div>
        {overview?.user.url && (
          <a
            href={overview.user.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {copy['music.profileLink']}
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </header>

      {overview ? (
        <div className="space-y-10">
          {hero && (
            <NowPlayingHero
              initial={hero}
              renderedAt={overview.generatedAt}
              labels={{
                nowPlaying: copy['music.nowPlaying'],
                lastPlayed: copy['music.lastPlayed'],
              }}
            />
          )}
          <Stats overview={overview} copy={copy} />
          <BlurFade inView delay={0.05}>
            <ActivityChart
              days={overview.activity}
              labels={{
                heading: copy['music.activityHeading'],
                summary: copy['music.activitySummary'],
                plays: copy['music.plays'],
              }}
            />
          </BlurFade>
          <TopCharts
            top={overview.top}
            labels={{
              heading: copy['music.chartsHeading'],
              periods: {
                '7day': copy['music.period7day'],
                '1month': copy['music.period1month'],
                '12month': copy['music.period12month'],
                overall: copy['music.periodOverall'],
              },
              artists: copy['music.topArtists'],
              albums: copy['music.topAlbums'],
              tracks: copy['music.topTracks'],
              plays: copy['music.plays'],
              empty: copy['music.empty'],
            }}
          />
          <RecentTracks overview={overview} copy={copy} />
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-24 text-center">
          <Disc3 className="size-10 text-muted-foreground" />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">{copy['music.unavailable']}</p>
        </div>
      )}
    </main>
  );
}
