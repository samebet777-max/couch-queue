const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the viewer's time zone, as YYYY-MM-DD to compare with TMDB air dates. */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
