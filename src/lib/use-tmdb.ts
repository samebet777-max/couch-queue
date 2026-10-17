import { useEffect, useState, useSyncExternalStore } from 'react';

import { showKey } from './household';
import { getPerson, getRecommendations, getTitle, type Kind, type TmdbMovie, type TmdbPerson, type TmdbShow, type TitleResult, type TmdbTitle } from './tmdb';

// Responses are cached so lists and detail pages share one fetch.
const cache = new Map<string, { promise: Promise<unknown>; at: number }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const promise = load().catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, { promise, at: Date.now() });
  }
  return cache.get(key)!.promise as Promise<T>;
}

/** Show details older than this are fetched again when the app comes back to the front. */
const FRESH_MS = 60 * 60 * 1000;
// Home-screen apps can stay open for days, so without this a show's return would go unnoticed.
let generation = 0;
const listeners = new Set<() => void>();

function refreshStale() {
  const cutoff = Date.now() - FRESH_MS;
  let dropped = false;
  for (const [key, entry] of cache) {
    if (entry.at < cutoff && (key.startsWith('show:') || key.startsWith('movie:'))) {
      cache.delete(key);
      dropped = true;
    }
  }
  if (!dropped) return;
  generation++;
  listeners.forEach((l) => l());
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refreshStale());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Changes whenever stale show details were dropped, so hooks fetch them again. */
const useGeneration = () => useSyncExternalStore(subscribe, () => generation, () => generation);

type State<T> = { data?: T; error?: string; loading: boolean };

function useCached<T>(key: string | null, load: () => Promise<T>): State<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  const fresh = useGeneration();
  useEffect(() => {
    if (key === null) return;
    let live = true;
    cached(key, load)
      .then((data) => live && setState({ key, data }))
      .catch((err: Error) => live && setState({ key, error: err.message }));
    return () => {
      live = false;
    };
  }, [key, fresh]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const fresh = useGeneration();
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
  }, [key, fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  return titles;
}

/** TMDB recommendations for several titles at once, keyed by showKey(). */
export function useRecommendations(items: { id: number; kind?: Kind }[]) {
  const [recs, setRecs] = useState<Record<string, TitleResult[] | Error>>({});
  const key = items.map(showKey).join(',');
  useEffect(() => {
    let live = true;
    items.forEach((item) => {
      const kind = item.kind ?? 'tv';
      const k = showKey(item);
      cached(`recs:${kind}:${item.id}`, () => getRecommendations(kind, item.id))
        .then((r) => live && setRecs((s) => ({ ...s, [k]: r })))
        .catch((err: Error) => live && setRecs((s) => ({ ...s, [k]: err })));
    });
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return recs;
}
