import { useEffect, useState } from 'react';

import { getPerson, getShow, type TmdbPerson, type TmdbShow } from './tmdb';

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

export const useShow = (id: number | null) =>
  useCached<TmdbShow>(id === null ? null : `show:${id}`, () => getShow(id as number));

export const usePerson = (id: number | null) =>
  useCached<TmdbPerson>(id === null ? null : `person:${id}`, () => getPerson(id as number));

/** Loads several shows at once; entries fill in as each one arrives. */
export function useShows(ids: number[]) {
  const [shows, setShows] = useState<Record<number, TmdbShow | Error>>({});
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    ids.forEach((id) =>
      cached(`show:${id}`, () => getShow(id))
        .then((show) => live && setShows((s) => ({ ...s, [id]: show })))
        .catch((err: Error) => live && setShows((s) => ({ ...s, [id]: err }))),
    );
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return shows;
}
