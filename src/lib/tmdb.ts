// Thin client for The Movie Database (TMDB) v3 API.
// Needs a free "API Read Access Token" in EXPO_PUBLIC_TMDB_TOKEN (see README).

const BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const tmdbToken = process.env.EXPO_PUBLIC_TMDB_TOKEN ?? '';
export const hasTmdb = tmdbToken.length > 0;

export type TmdbNetwork = { id: number; name: string; logo_path: string | null };

export type TmdbEpisode = {
  air_date: string | null;
  episode_number: number;
  season_number: number;
  name: string;
};

export type TmdbSeason = {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
};

export type TmdbVideo = { key: string; site: string; type: string; name: string; official: boolean };

export type TmdbCast = { id: number; name: string; character: string; profile_path: string | null };

export type TmdbReview = {
  id: string;
  author: string;
  content: string;
  url: string;
  created_at: string;
  author_details?: { rating: number | null };
};

export type TmdbProvider = { provider_id: number; provider_name: string; logo_path: string };

export type TmdbShow = {
  id: number;
  name: string;
  overview: string;
  tagline: string;
  status: string; // "Returning Series" | "Ended" | "Canceled" | "In Production" | "Planned" | "Pilot"
  in_production: boolean;
  first_air_date: string | null;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genres: { id: number; name: string }[];
  networks: TmdbNetwork[];
  seasons: TmdbSeason[];
  next_episode_to_air: TmdbEpisode | null;
  last_episode_to_air: TmdbEpisode | null;
  videos?: { results: TmdbVideo[] };
  aggregate_credits?: { cast: (Omit<TmdbCast, 'character'> & { roles: { character: string }[] })[] };
  reviews?: { results: TmdbReview[] };
  'watch/providers'?: {
    results: Record<string, { link: string; flatrate?: TmdbProvider[]; free?: TmdbProvider[]; ads?: TmdbProvider[] }>;
  };
};

export type TmdbSearchResult = {
  id: number;
  name: string;
  first_air_date: string | null;
  poster_path: string | null;
  overview: string;
};

export type TmdbPerson = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  profile_path: string | null;
  tv_credits?: { cast: (TmdbSearchResult & { character: string; episode_count: number })[] };
};

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!hasTmdb) throw new Error('Show data is not connected yet. Add a TMDB token to the app settings.');
  const query = new URLSearchParams({ language: 'en-US', ...params }).toString();
  const res = await fetch(`${BASE}${path}?${query}`, {
    headers: { Authorization: `Bearer ${tmdbToken}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Couldn't load show data (TMDB ${res.status}). Check the TMDB token.`);
  return res.json() as Promise<T>;
}

export function getShow(id: number) {
  return get<TmdbShow>(`/tv/${id}`, {
    append_to_response: 'videos,aggregate_credits,reviews,watch/providers',
  });
}

export async function searchShows(query: string) {
  const data = await get<{ results: TmdbSearchResult[] }>('/search/tv', { query, include_adult: 'false' });
  return data.results;
}

export function getPerson(id: number) {
  return get<TmdbPerson>(`/person/${id}`, { append_to_response: 'tv_credits' });
}

export function imageUrl(path: string | null | undefined, size: 'w92' | 'w185' | 'w342' | 'w780' | 'original' = 'w342') {
  return path ? `${IMAGE_BASE}/${size}${path}` : undefined;
}

/** The best trailer to show: official YouTube trailers first, newest season wins by API order. */
export function pickTrailer(show: TmdbShow): TmdbVideo | undefined {
  const youtube = (show.videos?.results ?? []).filter((v) => v.site === 'YouTube');
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official) ??
    youtube.find((v) => v.type === 'Trailer') ??
    youtube.find((v) => v.type === 'Teaser')
  );
}

export function networkLabel(show: Pick<TmdbShow, 'networks'>) {
  return show.networks.map((n) => n.name).join(' / ') || 'Network unknown';
}

/** Real seasons only; TMDB lists specials as season 0. */
export function realSeasons(show: TmdbShow) {
  return show.seasons.filter((s) => s.season_number > 0);
}
