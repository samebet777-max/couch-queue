// The shared list, as one document per household. Every entry carries its own
// updatedAt so two phones editing at once merge cleanly (newest entry wins).

export type ListName = 'watching' | 'waiting' | 'want' | 'done';

export const LISTS: { key: ListName; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'want', label: 'Want to see' },
  { key: 'done', label: 'Done' },
];

export type Member = { id: string; name: string; joinedAt: number; updatedAt: number };

export type SavedShow = {
  id: number; // TMDB id
  name: string;
  posterPath: string | null;
  list: ListName;
  addedBy: string; // member id
  addedAt: number;
  updatedAt: number;
  removed?: boolean;
};

/** How many seasons one member has finished for one show. */
export type Progress = { seasonsWatched: number; updatedAt: number };

export type Household = {
  code: string;
  members: Record<string, Member>;
  shows: Record<string, SavedShow>;
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
  return Object.values(h.members).sort((a, b) => a.joinedAt - b.joinedAt);
}
