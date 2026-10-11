// Decides which alerts a household should get, from its saved list and fresh TMDB details.
// No imports, so it runs the same in the Supabase function and in tests.

export type Saved = {
  id: number;
  kind?: 'movie';
  name: string;
  list: 'watching' | 'waiting' | 'want' | 'done';
  updatedAt: number;
  removed?: boolean;
  watchers?: string[];
  waitingSince?: string;
  newEpisodes?: boolean;
  seenSeason?: number;
};

export type Household = {
  code: string;
  members: Record<string, { id: string; removed?: boolean }>;
  shows: Record<string, Saved>;
};

type Episode = { air_date: string | null; episode_number: number; season_number: number };
export type TvDetails = {
  last_episode_to_air: Episode | null;
  next_episode_to_air: Episode | null;
  seasons?: { season_number: number; air_date: string | null }[];
};
export type MovieDetails = { release_date: string | null };

export type Alert = {
  showKey: string;
  /** Unique per household and show, so each alert goes out once. */
  event: string;
  members: string[];
  title: string;
  body: string;
  url: string;
};

/** Only recent news counts, so turning alerts on doesn't bring up things from long ago. */
const RECENT_DAYS = 3;

export function dateIn(timeZone: string, d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

const pretty = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

export function alertsFor(
  household: Household,
  details: (key: string, saved: Saved) => TvDetails | MovieDetails | undefined,
  today: string,
): Alert[] {
  const everyone = Object.values(household.members)
    .filter((m) => !m.removed)
    .map((m) => m.id);
  const alerts: Alert[] = [];

  for (const [key, saved] of Object.entries(household.shows)) {
    if (saved.removed || saved.list === 'done') continue;
    const d = details(key, saved);
    if (!d) continue;
    const members = saved.watchers?.length ? saved.watchers.filter((w) => everyone.includes(w)) : everyone;
    if (members.length === 0) continue;
    const since = saved.waitingSince ?? new Date(saved.updatedAt).toISOString().slice(0, 10);
    const url = saved.kind === 'movie' ? `/movie/${saved.id}` : `/show/${saved.id}`;
    const add = (event: string, title: string, body: string) =>
      alerts.push({ showKey: key, event, members, title, body, url });

    if (saved.kind === 'movie') {
      const out = (d as MovieDetails).release_date;
      if (saved.list === 'waiting' && out && out <= today && out > since && daysBetween(out, today) <= RECENT_DAYS) {
        add('released', `${saved.name} is out now!`, 'It’s on your Watching list.');
      }
      continue;
    }

    const { last_episode_to_air: last, next_episode_to_air: next, seasons } = d as TvDetails;
    const aired = last?.air_date;
    const recent = (date: string | null | undefined): date is string =>
      !!date && date <= today && daysBetween(date, today) <= RECENT_DAYS;
    const tracking = saved.list === 'watching' || saved.list === 'waiting';
    // A season whose first episode aired in the last few days, even if the app hasn't been opened.
    const premiere = seasons?.find((x) => x.season_number === last?.season_number)?.air_date;
    const cameBack =
      last &&
      recent(aired) &&
      (saved.newEpisodes ||
        (tracking &&
          ((saved.list === 'waiting' && aired > since) ||
            (saved.seenSeason !== undefined && last.season_number > saved.seenSeason) ||
            recent(premiere))));
    if (cameBack && last) {
      const first = last.season_number <= 1;
      add(
        `back:S${last.season_number}`,
        first ? `${saved.name} has premiered!` : `${saved.name} is back!`,
        `${first ? 'The first episodes are' : `New episodes of season ${last.season_number} are`} out. It’s on your Watching list.`,
      );
    }

    if (saved.list === 'want') continue;
    if (next?.air_date && next.episode_number === 1 && next.air_date > today) {
      const season = next.season_number;
      if (daysBetween(today, next.air_date) === 1) {
        add(`tomorrow:S${season}`, `${saved.name} returns tomorrow`, `Season ${season} starts ${pretty(next.air_date)}.`);
      } else {
        add(
          `date:S${season}:${next.air_date}`,
          `${saved.name}: season ${season} has a date`,
          `Season ${season} premieres ${pretty(next.air_date)}.`,
        );
      }
    }
  }
  return alerts;
}
