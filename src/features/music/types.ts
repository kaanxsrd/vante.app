export const MUSIC_PERIODS = ['7day', '1month', '12month', 'overall'] as const;
export type MusicPeriod = (typeof MUSIC_PERIODS)[number];

export interface MusicUser {
  name: string;
  url: string | null;
  plays: number;
  artists: number;
  albums: number;
  tracks: number;
  since: number | null;
}

export interface TopArtist {
  name: string;
  plays: number;
  url: string | null;
  image: string | null;
}

export interface TopAlbum extends TopArtist {
  artist: string;
}

export type TopTrack = TopAlbum;

export interface RecentTrack {
  name: string;
  artist: string;
  album: string;
  image: string | null;
  url: string | null;
  playedAt: number | null;
  nowPlaying: boolean;
}

export interface DayActivity {
  day: string;
  plays: number;
}

export interface MusicTop {
  artists: TopArtist[];
  albums: TopAlbum[];
  tracks: TopTrack[];
}

export type MusicTopByPeriod = Record<MusicPeriod, MusicTop>;

export interface MusicOverview {
  user: MusicUser;
  top: MusicTopByPeriod;
  activity: DayActivity[];
  recent: RecentTrack[];
  generatedAt: number;
}

export function largeArt(url: string | null): string | null {
  return url ? url.replace('/i/u/300x300/', '/i/u/500x500/') : null;
}
