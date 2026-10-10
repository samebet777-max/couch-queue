// Which list a show belongs on, how each list is ordered, and the one automatic move:
// a show waiting between seasons jumps to Watching once new episodes have aired.
import { showKey, type ListName, type SavedShow } from './household';
import type { TmdbMovie, TmdbShow, TmdbTitle } from './tmdb';
import type { TitleDetails } from './use-tmdb';

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the viewer's time zone, as YYYY-MM-DD to compare with TMDB air dates. */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ended = (show: TmdbShow) => show.status === 'Ended' || show.status === 'Canceled';

/** Still running, but nothing is airing right now: the next thing scheduled (if anything) is a premiere. */
export function isBetweenSeasons(show: TmdbShow, today = localDate()) {
  if (ended(show)) return false;
  const next = show.next_episode_to_air;
  if (!next?.air_date) return true;
  return next.episode_number === 1 && next.air_date > today;
}

function suggestMovie(movie: TmdbMovie, today: string): { list: ListName; reason: string } {
  if (!movie.release_date || movie.release_date > today) {
    return {
      list: 'waiting',
      reason: 'It isn’t out yet, so we suggest Waiting. It moves to Watching on its own once it’s released.',
    };
  }
  return { list: 'want', reason: 'It’s already out, so we suggest Want to see.' };
}

export function suggestList(show: TmdbTitle, today = localDate()): { list: ListName; reason: string } {
  if (show.media === 'movie') return suggestMovie(show, today);
  if (ended(show)) return { list: 'want', reason: 'It’s finished its run, so we suggest Want to see.' };
  if (!show.last_episode_to_air) return { list: 'waiting', reason: 'It hasn’t premiered yet, so we suggest Waiting.' };
  if (isBetweenSeasons(show)) {
    return {
      list: 'waiting',
      reason: 'It’s between seasons, so we suggest Waiting. It moves to Watching on its own when new episodes air.',
    };
  }
  return { list: 'watching', reason: 'New episodes are airing, so we suggest Watching.' };
}

/** The date a show went into Waiting; older records fall back to their last change. */
function waitingSince(saved: SavedShow) {
  return saved.waitingSince ?? localDate(new Date(saved.updatedAt));
}

/**
 * Changes the app makes on its own once show details load:
 * - a show in Waiting whose newest episode aired after it went there moves to Watching, flagged as new;
 * - a one-time tidy moves shows from Watching to Waiting when they're between seasons.
 */
export function automaticChanges(saved: SavedShow, show: TmdbTitle, today = localDate()): Partial<SavedShow> | null {
  if (show.media === 'movie') {
    // A movie waiting to come out moves to Watching on its release day.
    const out = show.release_date;
    return saved.list === 'waiting' && out && out <= today && out > waitingSince(saved)
      ? { list: 'watching', newEpisodes: true, waitingSince: undefined, tidied: true }
      : saved.tidied
        ? null
        : { tidied: true };
  }
  const aired = show.last_episode_to_air?.air_date;
  if (saved.list === 'waiting' && aired && aired <= today && aired > waitingSince(saved)) {
    return { list: 'watching', newEpisodes: true, waitingSince: undefined, tidied: true };
  }
  if (!saved.tidied) {
    return saved.list === 'watching' && isBetweenSeasons(show, today)
      ? { list: 'waiting', waitingSince: today, tidied: true }
      : { tidied: true };
  }
  return null;
}

const byName = (a: SavedShow, b: SavedShow) => a.name.localeCompare(b.name);

/** Soonest upcoming episode first, same-day shows A to Z, shows with no date after them A to Z. */
function byNextEpisode(details: TitleDetails, today: string) {
  const next = (s: SavedShow) => {
    const d = details[showKey(s)];
    const date = !d || d instanceof Error ? null : d.media === 'movie' ? d.release_date : d.next_episode_to_air?.air_date;
    return date && date >= today ? date : null;
  };
  return (a: SavedShow, b: SavedShow) => {
    const da = next(a);
    const db = next(b);
    if (da && db && da !== db) return da < db ? -1 : 1;
    if (!!da !== !!db) return da ? -1 : 1;
    return byName(a, b);
  };
}

export function sortList(list: ListName, shows: SavedShow[], details: TitleDetails) {
  const today = localDate();
  const sorted = [...shows];
  switch (list) {
    case 'watching': {
      const soonest = byNextEpisode(details, today);
      // Shows that just came back sit on top until someone opens them.
      return sorted.sort((a, b) => Number(!!b.newEpisodes) - Number(!!a.newEpisodes) || soonest(a, b));
    }
    case 'waiting':
      return sorted.sort(byNextEpisode(details, today));
    case 'want':
      return sorted.sort((a, b) => b.addedAt - a.addedAt);
    case 'done':
      return sorted.sort(byName);
  }
}
