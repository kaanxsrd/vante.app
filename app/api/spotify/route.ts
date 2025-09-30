import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrack {
  name: string;
  duration_ms: number;
  external_urls?: {
    spotify?: string;
  };
  album?: {
    images?: { url: string }[];
  };
  artists?: SpotifyArtist[];
}

interface SpotifyNowPlayingResponse {
  is_playing: boolean;
  progress_ms: number;
  item?: SpotifyTrack | null;
}

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

const toBase64 = (value: string) => Buffer.from(value).toString('base64');

async function getAccessToken(
  debugInfo: Record<string, unknown>,
  captureDebug: boolean,
): Promise<string | null> {
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  if (captureDebug) {
    debugInfo.tokenRequest = {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasRefreshToken: Boolean(refreshToken),
    };
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${toBase64(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });

  if (captureDebug) {
    debugInfo.tokenResponse = {
      status: response.status,
    };
  }

  if (!response.ok) {
    if (captureDebug) {
      debugInfo.tokenResponseBody = await response.text();
    }
    return null;
  }

  const data = (await response.json()) as SpotifyTokenResponse;

  if (captureDebug) {
    debugInfo.tokenResponseBody = {
      received: Boolean(data.access_token),
      expiresIn: data.expires_in,
    };
  }

  return data.access_token;
}

async function getNowPlaying(
  accessToken: string,
  debugInfo: Record<string, unknown>,
  captureDebug: boolean,
) {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (captureDebug) {
    debugInfo.playbackResponse = {
      status: response.status,
    };
  }

  if (response.status === 204) {
    return { isPlaying: false } as const;
  }

  if (response.status > 400) {
    if (captureDebug) {
      debugInfo.playbackError = await response.text();
    }
    return { isPlaying: false } as const;
  }

  const data = (await response.json()) as SpotifyNowPlayingResponse;

  if (captureDebug) {
    debugInfo.playbackResponse = {
      ...(debugInfo.playbackResponse as Record<string, unknown>),
      isPlaying: data?.is_playing ?? false,
      hasItem: Boolean(data?.item),
      progressMs: data?.progress_ms ?? null,
    };
  }

  if (!data?.is_playing || !data.item) {
    return { isPlaying: false } as const;
  }

  const track = data.item;
  const artist = track.artists?.map((entry) => entry.name).join(', ') ?? '';
  const albumImageUrl = track.album?.images?.[0]?.url;

  return {
    isPlaying: true,
    title: track.name,
    artist,
    albumImageUrl,
    songUrl: track.external_urls?.spotify ?? null,
    progressMs: data.progress_ms ?? 0,
    durationMs: track.duration_ms ?? 0,
  } as const;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const debugParam = url.searchParams.get('debug');
  const debug = debugParam === 'true' || debugParam === '1' || process.env.SPOTIFY_DEBUG === 'true';

  const debugInfo: Record<string, unknown> = {
    env: {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasRefreshToken: Boolean(refreshToken),
    },
  };

  const respond = (payload: Record<string, unknown>, init?: ResponseInit): NextResponse => {
    if (debug) {
      return NextResponse.json({ ...payload, debug: debugInfo }, init);
    }
    return NextResponse.json(payload, init);
  };

  try {
    if (!clientId || !clientSecret || !refreshToken) {
      debugInfo.error = 'Missing Spotify credentials. Ensure environment variables are set.';
      return respond({ isPlaying: false });
    }

    const accessToken = await getAccessToken(debugInfo, debug);

    if (!accessToken) {
      debugInfo.error = debugInfo.error ?? 'Failed to obtain Spotify access token.';
      return respond({ isPlaying: false });
    }

    const nowPlaying = await getNowPlaying(accessToken, debugInfo, debug);

    return respond(nowPlaying);
  } catch (error) {
    debugInfo.exception =
      error instanceof Error ? { message: error.message, stack: error.stack } : String(error);

    return respond({ isPlaying: false }, { status: debug ? 500 : 200 });
  }
}
