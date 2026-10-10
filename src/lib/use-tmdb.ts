import { useEffect, useState } from 'react';

import { showKey } from './household';
import { getPerson, getTitle, type Kind, type TmdbMovie, type TmdbPerson, type TmdbShow, type TmdbTitle } from './tmdb';

// Responses are cached for the session so lists and detail pages share one fetch.
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const promise = load().catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, promise);
  }
  return cache.get(key) as Promise<T>;
}

type State<T> = { data?: T; error?: string; loading: boolean };

function useCached<T>(key: string | null, load: () => Promise<T>): State<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  useEffect(() => {
    if (key === null) return;
    let live = true;
    cached(key, load)
      .then((data) => live && setState({ key, data }))
      .catch((err: Error) => live && setState({ key, error: err.message }));
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (key === null || state.key !== key) return { loading: key !== null };
  return { data: state.data, error: state.error, loading: false };
}

const titleCacheKey = (kind: Kind, id: number) => (kind === 'movie' ? `movie:${id}` : `show:${id}`);

export const useShow = (id: number | null) =>
  useCached<TmdbShow>(id === null ? null : titleCacheKey('tv', id), () => getTitle('tv', id as number) as Promise<TmdbShow>);

export const useMovie = (id: number | null) =>
  useCached<TmdbMovie>(id === null ? null : titleCacheKey('movie', id), () => getTitle('movie', id as number) as Promise<TmdbMovie>);

export const useTitle = (kind: Kind, id: number | null) =>
  useCached<TmdbTitle>(id === null ? null : titleCacheKey(kind, id), () => getTitle(kind, id as number));

export const usePerson = (id: number | null) =>
  useCached<TmdbPerson>(id === null ? null : `person:${id}`, () => getPerson(id as number));

export type TitleDetails = Record<string, TmdbTitle | Error>;

/** Loads several shows and movies at once, keyed by showKey(); entries fill in as each one arrives. */
export function useTitles(items: { id: number; kind?: Kind }[]) {
  const [titles, setTitles] = useState<TitleDetails>({});
  const key = items.map(showKey).join(',');
  useEffect(() => {
    let live = true;
    items.forEach((item) => {
      const kind = item.kind ?? 'tv';
      const k = showKey(item);
      cached(titleCacheKey(kind, item.id), () => getTitle(kind, item.id))
        .then((t) => live && setTitles((s) => ({ ...s, [k]: t })))
        .catch((err: Error) => live && setTitles((s) => ({ ...s, [k]: err })));
    });
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return titles;
}
