// "Suggested for you": TMDB's recommendations for each of your titles, merged so that
// titles recommended by several of your shows (and near the top of their lists) rank first.
import { isFor, showKey, type Member, type SavedShow } from './household';
import type { TitleResult } from './tmdb';

export type Audience = 'me' | 'us';

/** How many of your titles to ask TMDB about. Recently changed ones first. */
const MAX_SEEDS = 15;
/** Titles with fewer votes than this are too obscure to suggest. */
const MIN_VOTES = 50;

export type Suggestion = { title: TitleResult; because: string[]; score: number };

/**
 * Seeds for each view. "Just me": titles tagged only to me. "Both of us": titles everyone in
 * the household is tagged on (untagged titles count as everyone's).
 */
export function seedsFor(audience: Audience, shows: SavedShow[], members: Member[], me: Member | null) {
  const everyone = members.map((m) => m.id);
  const others = everyone.filter((id) => id !== me?.id);
  return shows
    .filter((s) => !s.removed)
    .filter((s) =>
      audience === 'me'
        ? !!me && isFor(s, me.id) && others.every((id) => !isFor(s, id))
        : everyone.every((id) => isFor(s, id)),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SEEDS);
}

export function rankSuggestions(
  seeds: SavedShow[],
  recommendations: Record<string, TitleResult[] | Error | undefined>,
  onList: (t: TitleResult) => boolean,
  limit = 20,
): Suggestion[] {
  const found = new Map<string, Suggestion>();
  for (const seed of seeds) {
    const recs = recommendations[showKey(seed)];
    if (!recs || recs instanceof Error) continue;
    recs.forEach((title, rank) => {
      if (title.votes < MIN_VOTES || onList(title)) return;
      const key = showKey(title);
      const entry = found.get(key) ?? { title, because: [], score: 0 };
      if (!entry.because.includes(seed.name)) entry.because.push(seed.name);
      entry.score += 1 / (rank + 1);
      found.set(key, entry);
    });
  }
  return [...found.values()]
    .sort((a, b) => b.because.length - a.because.length || b.score - a.score || b.title.votes - a.title.votes)
    .slice(0, limit);
}

/** "Because you like A and B" / "Because you like A, B and 2 more". */
export function becauseText(names: string[]) {
  if (names.length === 1) return `Because you like ${names[0]}`;
  if (names.length === 2) return `Because you like ${names[0]} and ${names[1]}`;
  if (names.length === 3) return `Because you like ${names[0]}, ${names[1]} and ${names[2]}`;
  return `Because you like ${names[0]}, ${names[1]} and ${names.length - 2} more`;
}
