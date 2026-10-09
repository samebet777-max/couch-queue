import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  emptyHousehold,
  mergeHouseholds,
  newId,
  orderedMembers,
  progressKey,
  type Household,
  type ListName,
  type Member,
  type SavedShow,
} from './household';
import { fetchHousehold, hasSync, pushHousehold } from './sync';

const STORAGE_KEY = 'couchqueue:v1';
const POLL_MS = 30_000;

// TMDB ids for the shows David asked to start with.
export const STARTER_SHOWS: Pick<SavedShow, 'id' | 'name'>[] = [
  { id: 60574, name: 'Peaky Blinders' },
  { id: 987, name: 'General Hospital' },
  { id: 103516, name: 'Star Trek: Strange New Worlds' },
];

export type SyncState = 'local' | 'syncing' | 'synced' | 'offline';

type Saved = { household: Household | null; meId: string | null };

type Store = {
  ready: boolean;
  household: Household | null;
  me: Member | null;
  members: Member[];
  shows: SavedShow[];
  syncState: SyncState;
  createHousehold: (name: string) => void;
  joinHousehold: (code: string, name: string) => Promise<void>;
  rename: (name: string) => void;
  addShow: (show: Pick<SavedShow, 'id' | 'name' | 'posterPath'>, list?: ListName) => void;
  moveShow: (id: number, list: ListName) => void;
  removeShow: (id: number) => void;
  setSeasonsWatched: (showId: number, seasons: number) => void;
  seasonsWatched: (showId: number, memberId: string) => number;
  syncNow: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Saved>({ household: null, meId: null });
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(hasSync ? 'syncing' : 'local');
  const latest = useRef(saved);
  useEffect(() => {
    latest.current = saved;
  }, [saved]);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setSaved(JSON.parse(raw) as Saved))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved, ready]);

  const applyRemote = useCallback((remote: Household | null) => {
    if (!remote) return;
    setSaved((s) => (s.household ? { ...s, household: mergeHouseholds(s.household, remote) } : s));
  }, []);

  const syncNow = useCallback(async () => {
    const household = latest.current.household;
    if (!hasSync || !household) return;
    setSyncState('syncing');
    try {
      applyRemote(await pushHousehold(household));
      setSyncState('synced');
    } catch {
      setSyncState('offline');
    }
  }, [applyRemote]);

  // Every local change is pushed shortly after it happens.
  const update = useCallback(
    (fn: (h: Household, meId: string | null) => Household) => {
      setSaved((s) => (s.household ? { ...s, household: fn(s.household, s.meId) } : s));
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(syncNow, 800);
    },
    [syncNow],
  );

  // Pick up the other phone's changes while open and whenever the app comes back.
  useEffect(() => {
    if (!ready || !hasSync || !saved.household) return;
    syncNow();
    const interval = setInterval(syncNow, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && syncNow());
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [ready, saved.household?.code, syncNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const createHousehold = useCallback(
    (name: string) => {
      const now = Date.now();
      const me: Member = { id: newId(), name: name.trim(), joinedAt: now, updatedAt: now };
      const household = emptyHousehold();
      household.members[me.id] = me;
      STARTER_SHOWS.forEach((show, i) => {
        household.shows[show.id] = {
          ...show,
          posterPath: null,
          list: 'watching',
          addedBy: me.id,
          addedAt: now + i,
          updatedAt: now + i,
        };
      });
      // The first push happens in the polling effect once this lands.
      setSaved({ household, meId: me.id });
    },
    [],
  );

  const joinHousehold = useCallback(async (code: string, name: string) => {
    if (!hasSync) throw new Error('Sharing is not set up in this copy of the app yet.');
    const remote = await fetchHousehold(code.trim().toUpperCase());
    if (!remote) throw new Error('No household uses that code. Check it and try again.');
    const now = Date.now();
    const me: Member = { id: newId(), name: name.trim(), joinedAt: now, updatedAt: now };
    const household = { ...remote, members: { ...remote.members, [me.id]: me } };
    setSaved({ household, meId: me.id });
    setSyncState('synced');
    applyRemoteAfterPush(household);

    async function applyRemoteAfterPush(h: Household) {
      try {
        const merged = await pushHousehold(h);
        setSaved((s) => (s.household ? { ...s, household: mergeHouseholds(s.household, merged) } : s));
      } catch {
        setSyncState('offline');
      }
    }
  }, []);

  const value = useMemo<Store>(() => {
    const household = saved.household;
    const me = (household && saved.meId && household.members[saved.meId]) || null;
    const shows = household
      ? Object.values(household.shows)
          .filter((s) => !s.removed)
          .sort((a, b) => b.addedAt - a.addedAt)
      : [];

    return {
      ready,
      household,
      me,
      members: household ? orderedMembers(household) : [],
      shows,
      syncState,
      createHousehold,
      joinHousehold,
      syncNow,
      rename: (name) =>
        update((h, meId) =>
          meId ? { ...h, members: { ...h.members, [meId]: { ...h.members[meId], name, updatedAt: Date.now() } } } : h,
        ),
      addShow: (show, list = 'want') =>
        update((h, meId) => {
          const existing = h.shows[show.id];
          const now = Date.now();
          return {
            ...h,
            shows: {
              ...h.shows,
              [show.id]: {
                ...show,
                list: existing && !existing.removed ? existing.list : list,
                addedBy: existing?.addedBy ?? meId ?? '',
                addedAt: existing && !existing.removed ? existing.addedAt : now,
                updatedAt: now,
                removed: false,
              },
            },
          };
        }),
      moveShow: (id, list) =>
        update((h) =>
          h.shows[id] ? { ...h, shows: { ...h.shows, [id]: { ...h.shows[id], list, updatedAt: Date.now() } } } : h,
        ),
      removeShow: (id) =>
        update((h) =>
          h.shows[id]
            ? { ...h, shows: { ...h.shows, [id]: { ...h.shows[id], removed: true, updatedAt: Date.now() } } }
            : h,
        ),
      setSeasonsWatched: (showId, seasons) =>
        update((h, meId) =>
          meId
            ? {
                ...h,
                progress: {
                  ...h.progress,
                  [progressKey(showId, meId)]: { seasonsWatched: seasons, updatedAt: Date.now() },
                },
              }
            : h,
        ),
      seasonsWatched: (showId, memberId) => household?.progress[progressKey(showId, memberId)]?.seasonsWatched ?? 0,
    };
  }, [saved, ready, syncState, createHousehold, joinHousehold, syncNow, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
