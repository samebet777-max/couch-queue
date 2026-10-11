import { useEffect } from 'react';

import { showKey, type SavedShow } from '@/lib/household';
import { automaticChanges } from '@/lib/smart-lists';
import { useStore } from '@/lib/store';
import { useTitles } from '@/lib/use-tmdb';

/** Keeps the lists current: runs whenever the app opens and show details arrive. Renders nothing. */
export function ListAutomation() {
  const { shows, patchShows } = useStore();
  // TV shows not marked Done (to notice new seasons), and movies waiting to come out.
  const candidates = shows.filter((s) => (s.kind === 'movie' ? s.list === 'waiting' : s.list !== 'done'));
  const details = useTitles(candidates);

  useEffect(() => {
    const patches: Record<string, Partial<SavedShow>> = {};
    for (const saved of candidates) {
      const key = showKey(saved);
      const show = details[key];
      if (!show || show instanceof Error) continue;
      const change = automaticChanges(saved, show);
      if (change) patches[key] = change;
    }
    if (Object.keys(patches).length) patchShows(patches);
  }, [details, candidates, patchShows]);

  return null;
}
