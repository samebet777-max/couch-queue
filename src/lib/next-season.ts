import type { TmdbShow } from './tmdb';

export type Tone = 'ok' | 'warn' | 'info' | 'end';

export type NextSeason = {
  /** Short pill text, e.g. "Season 4 on Mar 12". */
  label: string;
  /** One sentence for the show page and news feed. */
  detail: string;
  tone: Tone;
  /** ISO date of the next known episode, used to sort the news feed. */
  date?: string;
};

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Turns TMDB's status fields into what a viewer wants to know: is more coming, and when? */
export function nextSeason(show: TmdbShow, today = new Date()): NextSeason {
  const next = show.next_episode_to_air;
  const lastSeason = Math.max(0, ...show.seasons.filter((s) => s.season_number > 0).map((s) => s.season_number));

  if (next?.air_date) {
    const isPremiere = next.episode_number === 1;
    const when = fmt(next.air_date);
    return isPremiere
      ? {
          label: `Season ${next.season_number} on ${when.replace(/, \d{4}$/, '')}`,
          detail: `Season ${next.season_number} premieres ${when}.`,
          tone: 'warn',
          date: next.air_date,
        }
      : {
          label: 'New episodes airing',
          detail: `Next up: S${next.season_number} E${next.episode_number}, "${next.name}", on ${when}.`,
          tone: 'ok',
          date: next.air_date,
        };
  }

  // A season listed in TMDB with no air date yet means it's been announced.
  const upcoming = show.seasons.find(
    (s) => s.season_number > 0 && (!s.air_date || new Date(s.air_date) > today),
  );
  if (upcoming) {
    return {
      label: `${upcoming.name} announced`,
      detail: `${upcoming.name} is on the way. No premiere date yet.`,
      tone: 'info',
    };
  }

  switch (show.status) {
    case 'Ended':
      return { label: 'Ended', detail: `The series ended after ${lastSeason} seasons.`, tone: 'end' };
    case 'Canceled':
      return { label: 'Canceled', detail: `The network canceled it after ${lastSeason} seasons.`, tone: 'end' };
    case 'In Production':
      return { label: 'In production', detail: 'New episodes are being made. No date yet.', tone: 'info' };
    case 'Planned':
      return { label: 'Planned', detail: 'Announced but not yet in production.', tone: 'info' };
    default:
      return show.in_production
        ? { label: 'Coming back', detail: `Season ${lastSeason + 1} is expected. No date yet.`, tone: 'info' }
        : { label: 'Waiting for news', detail: 'No renewal or premiere date announced yet.', tone: 'end' };
  }
}
