// "Up next": the next episode the household will watch, shared by everyone on the list.
// It can point past the newest aired episode, which means you're all caught up.
import { realSeasons, type TmdbShow } from './tmdb';

export type UpNext = { season: number; episode: number };

const before = (a: UpNext, b: UpNext) => a.season < b.season || (a.season === b.season && a.episode < b.episode);

/** How many episodes of a season have aired, going by TMDB's newest aired episode. */
export function airedCount(show: TmdbShow, season: number) {
  const last = show.last_episode_to_air;
  if (!last || season > last.season_number) return 0;
  if (season === last.season_number) return last.episode_number;
  return show.seasons.find((s) => s.season_number === season)?.episode_count ?? 0;
}

/** Seasons with at least one aired episode, in order. */
export function airedSeasons(show: TmdbShow) {
  return realSeasons(show)
    .map((s) => s.season_number)
    .filter((n) => airedCount(show, n) > 0)
    .sort((a, b) => a - b);
}

/** The episode after this one: the next in the season, or the first of the next season. */
export function nextEpisode(show: TmdbShow, up: UpNext): UpNext {
  const count = show.seasons.find((s) => s.season_number === up.season)?.episode_count ?? 0;
  // TMDB sometimes only lists the episodes aired so far, so trust its next scheduled episode too.
  const continues = show.next_episode_to_air?.season_number === up.season;
  if (up.episode < count || continues) return { season: up.season, episode: up.episode + 1 };
  const later = realSeasons(show)
    .map((s) => s.season_number)
    .filter((n) => n > up.season)
    .sort((a, b) => a - b)[0];
  return { season: later ?? up.season + 1, episode: 1 };
}

/** Where "up next" points once every aired episode is watched. */
export function caughtUpPoint(show: TmdbShow): UpNext {
  const last = show.last_episode_to_air;
  if (!last) return { season: airedSeasons(show)[0] ?? 1, episode: 1 };
  return nextEpisode(show, { season: last.season_number, episode: last.episode_number });
}

/** The first episode of the show. */
export function firstEpisode(show: TmdbShow): UpNext {
  return { season: airedSeasons(show)[0] ?? 1, episode: 1 };
}

export function isCaughtUp(show: TmdbShow, up: UpNext) {
  return !before(up, caughtUpPoint(show));
}

/** Aired episodes not watched yet: this one and everything after it. */
export function episodesLeft(show: TmdbShow, up: UpNext) {
  let left = 0;
  for (const season of airedSeasons(show)) {
    const aired = airedCount(show, season);
    if (season > up.season) left += aired;
    else if (season === up.season) left += Math.max(0, aired - up.episode + 1);
  }
  return left;
}

export const episodeLabel = (up: UpNext) => `S${up.season} E${up.episode}`;
