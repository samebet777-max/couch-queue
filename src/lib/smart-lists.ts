// Which list a show belongs on, how each list is ordered, and the only automatic move:
// shows move INTO Watching when they come back (or a movie comes out). Moving a show
// out of Watching is always up to the people using the app.
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
  // TV shows go in Watching; they get a "New episodes!" tag there when they come back.
  if (ended(show)) {
    return { list: 'watching', reason: 'It’s finished its run. Pick Want to see if you haven’t started it yet.' };
  }
  if (!show.last_episode_to_air) {
    return { list: 'watching', reason: 'It hasn’t premiered yet. It gets a New episodes tag when it starts.' };
  }
  if (isBetweenSeasons(show, today)) {
    return { list: 'watching', reason: 'It’s between seasons. It gets a New episodes tag when it comes back.' };
  }
  return { list: 'watching', reason: 'New episodes are airing.' };
}

/** The date a show went into Waiting; older records fall back to their last change. */
function waitingSince(saved: SavedShow) {
  return saved.waitingSince ?? localDate(new Date(saved.updatedAt));
}

/**
 * Changes the app makes on its own once show details load. Shows only ever move INTO Watching:
 * - a show whose new season has started gets a "New episodes!" tag, and moves to Watching
 *   if it was in Waiting (shows in Want to see or Done stay put);
 * - a movie in Waiting moves to Watching on its release day.
 * seenSeason remembers the newest season the app has noticed, so each return is flagged once.
 */
export function automaticChanges(saved: SavedShow, show: TmdbTitle, today = localDate()): Partial<SavedShow> | null {
  if (show.media === 'movie') {
    const out = show.release_date;
    return saved.list === 'waiting' && out && out <= today && out > waitingSince(saved)
      ? { list: 'watching', newEpisodes: true, waitingSince: undefined }
      : null;
  }

  const last = show.last_episode_to_air;
  const aired = last?.air_date && last.air_date <= today ? last : null;
  const season = aired?.season_number ?? 0;
  const tracking = saved.list === 'watching' || saved.list === 'waiting';

  // Older entries: in Waiting since before the newest episode aired means it came back.
  const backWhileWaiting = saved.list === 'waiting' && !!aired && aired.air_date! > waitingSince(saved);
  // First look at this show: remember where it's at without flagging anything.
  if (saved.seenSeason === undefined && !backWhileWaiting) return { seenSeason: season };

  const newSeason = saved.seenSeason !== undefined && season > saved.seenSeason;
  if (tracking && (newSeason || backWhileWaiting)) {
    return { list: 'watching', newEpisodes: true, waitingSince: undefined, seenSeason: season };
  }
  return newSeason ? { seenSeason: season } : null;
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
