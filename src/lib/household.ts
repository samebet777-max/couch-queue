// The shared list, as one document per household. Every entry carries its own
// updatedAt so two phones editing at once merge cleanly (newest entry wins).

export type ListName = 'watching' | 'waiting' | 'want' | 'done';

export const LISTS: { key: ListName; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'want', label: 'Want to see' },
  { key: 'done', label: 'Done' },
];

export type Member = { id: string; name: string; joinedAt: number; updatedAt: number; removed?: boolean };

export type SavedShow = {
  id: number; // TMDB id
  /** Missing means a TV show (everything saved before movies were added). */
  kind?: 'movie';
  name: string;
  posterPath: string | null;
  list: ListName;
  addedBy: string; // member id
  addedAt: number;
  updatedAt: number;
  removed?: boolean;
  /** Who this show is for. Missing or empty means everyone in the household. */
  watchers?: string[];
  /** Local date (YYYY-MM-DD) the show went into Waiting, so only episodes after it count as new. */
  waitingSince?: string;
  /** Moved to Watching because new episodes aired; cleared once someone opens the show. */
  newEpisodes?: boolean;
  /** Already checked by the one-time tidy into Waiting. */
  tidied?: boolean;
};

/** Where an entry lives in `Household.shows`. TV shows keep their bare TMDB id so older entries still match. */
export function showKey(item: { id: number; kind?: 'tv' | 'movie' }) {
  return item.kind === 'movie' ? `movie:${item.id}` : String(item.id);
}

/** Whether a show belongs on this member's list. */
export function isFor(show: SavedShow, memberId: string | undefined) {
  return !show.watchers?.length || !memberId || show.watchers.includes(memberId);
}

/** How many seasons one member has finished for one show. */
export type Progress = { seasonsWatched: number; updatedAt: number };

export type Household = {
  code: string;
  members: Record<string, Member>;
  shows: Record<string, SavedShow>; // key: showKey()
  progress: Record<string, Progress>; // key: `${showId}:${memberId}`
};

export const progressKey = (showId: number, memberId: string) => `${showId}:${memberId}`;

// No 0/O/1/I/L so the code is easy to read out loud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyHousehold(): Household {
  return { code: newCode(), members: {}, shows: {}, progress: {} };
}

function mergeMap<T extends { updatedAt: number }>(a: Record<string, T>, b: Record<string, T>) {
  const out: Record<string, T> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (!out[key] || value.updatedAt > out[key].updatedAt) out[key] = value;
  }
  return out;
}

export function mergeHouseholds(local: Household, remote: Household): Household {
  return {
    code: remote.code,
    members: mergeMap(local.members, remote.members),
    shows: mergeMap(local.shows, remote.shows),
    progress: mergeMap(local.progress, remote.progress),
  };
}

/** Members in the order they joined, each with a stable color slot. */
export function orderedMembers(h: Household) {
  return Object.values(h.members)
    .filter((m) => !m.removed)
    .sort((a, b) => a.joinedAt - b.joinedAt);
}
