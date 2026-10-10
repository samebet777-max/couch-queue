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
  media: 'tv';
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

export type TmdbMovie = {
  media: 'movie';
  id: number;
  title: string;
  overview: string;
  tagline: string;
  status: string; // "Released" | "Post Production" | "In Production" | "Planned" | "Rumored" | "Canceled"
  release_date: string | null;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genres: { id: number; name: string }[];
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCast[] };
  reviews?: { results: TmdbReview[] };
  'watch/providers'?: TmdbShow['watch/providers'];
};

/** A show or a movie, as loaded for lists and detail pages. */
export type TmdbTitle = TmdbShow | TmdbMovie;

export type Kind = 'tv' | 'movie';

/** One search hit or film credit, shows and movies alike. */
export type TitleResult = {
  kind: Kind;
  id: number;
  name: string;
  date: string | null;
  poster_path: string | null;
  popularity: number;
};

export type PersonResult = { id: number; name: string; profile_path: string | null; knownFor: string[]; popularity: number };

type RawCredit = {
  media_type: string;
  id: number;
  name?: string;
  title?: string;
  first_air_date?: string;
  release_date?: string;
  poster_path: string | null;
  popularity?: number;
  vote_count?: number;
  character?: string;
  episode_count?: number;
  genre_ids?: number[];
};

const toTitle = (r: RawCredit): TitleResult => ({
  kind: r.media_type === 'movie' ? 'movie' : 'tv',
  id: r.id,
  name: r.title ?? r.name ?? '',
  date: (r.media_type === 'movie' ? r.release_date : r.first_air_date) || null,
  poster_path: r.poster_path,
  popularity: r.popularity ?? 0,
});

export type TmdbPerson = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  profile_path: string | null;
  combined_credits?: { cast: RawCredit[] };
};

export type Credit = TitleResult & { character: string };

// Talk shows, news, reality and award shows: guest spots there aren't roles anyone looks for.
const NOT_ROLES = new Set([10767, 10763, 10764]);

/**
 * Someone's real roles, each title once: regular TV roles (most episodes first) and movies
 * (most widely seen first). One-episode guest spots and talk-show appearances are left out.
 */
export function personCredits(person: TmdbPerson): { tv: Credit[]; movies: Credit[] } {
  const seen = new Set<string>();
  const roles = (person.combined_credits?.cast ?? [])
    .filter((c) => !c.genre_ids?.some((g) => NOT_ROLES.has(g)))
    .filter((c) => !/^(himself|herself|themselves|self)\b/i.test(c.character ?? ''))
    .filter((c) => {
      const key = `${c.media_type}:${c.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const toCredit = (c: RawCredit): Credit => ({ ...toTitle(c), character: c.character ?? '' });
  return {
    tv: roles
      .filter((c) => c.media_type === 'tv' && (c.episode_count ?? 0) >= 3)
      .sort((a, b) => (b.episode_count ?? 0) - (a.episode_count ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0))
      .map(toCredit),
    movies: roles
      .filter((c) => c.media_type === 'movie' && !!c.character)
      .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      .map(toCredit),
  };
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!hasTmdb) throw new Error('Show data is not connected yet. Add a TMDB token to the app settings.');
  const query = new URLSearchParams({ language: 'en-US', ...params }).toString();
  const res = await fetch(`${BASE}${path}?${query}`, {
    headers: { Authorization: `Bearer ${tmdbToken}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Couldn't load show data (TMDB ${res.status}). Check the TMDB token.`);
  return res.json() as Promise<T>;
}

export async function getShow(id: number): Promise<TmdbShow> {
  const show = await get<Omit<TmdbShow, 'media'>>(`/tv/${id}`, {
    append_to_response: 'videos,aggregate_credits,reviews,watch/providers',
  });
  return { ...show, media: 'tv' };
}

export async function getMovie(id: number): Promise<TmdbMovie> {
  const movie = await get<Omit<TmdbMovie, 'media'>>(`/movie/${id}`, {
    append_to_response: 'videos,credits,reviews,watch/providers',
  });
  return { ...movie, media: 'movie' };
}

export const getTitle = (kind: Kind, id: number): Promise<TmdbTitle> => (kind === 'movie' ? getMovie(id) : getShow(id));

/** Shows, movies and people in one search, people listed separately. */
export async function search(query: string) {
  const data = await get<{ results: (RawCredit & { profile_path?: string | null; known_for?: RawCredit[] })[] }>(
    '/search/multi',
    { query, include_adult: 'false' },
  );
  const titles = data.results.filter((r) => r.media_type === 'tv' || r.media_type === 'movie').map(toTitle);
  const people: PersonResult[] = data.results
    .filter((r) => r.media_type === 'person')
    .map((r) => ({
      id: r.id,
      name: r.name ?? '',
      profile_path: r.profile_path ?? null,
      knownFor: (r.known_for ?? []).map((k) => k.title ?? k.name ?? '').filter(Boolean),
      popularity: r.popularity ?? 0,
    }));
  return { titles, people };
}

export function getPerson(id: number) {
  return get<TmdbPerson>(`/person/${id}`, { append_to_response: 'combined_credits' });
}

/** Title of a show or movie. */
export const titleName = (t: TmdbTitle) => (t.media === 'movie' ? t.title : t.name);

export function imageUrl(path: string | null | undefined, size: 'w92' | 'w185' | 'w342' | 'w780' | 'original' = 'w342') {
  return path ? `${IMAGE_BASE}/${size}${path}` : undefined;
}

/** The best trailer to show: official YouTube trailers first, newest season wins by API order. */
export function pickTrailer(show: TmdbTitle): TmdbVideo | undefined {
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
