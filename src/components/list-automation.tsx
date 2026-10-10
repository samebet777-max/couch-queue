import { useEffect } from 'react';

import { showKey, type SavedShow } from '@/lib/household';
import { automaticChanges } from '@/lib/smart-lists';
import { useStore } from '@/lib/store';
import { useTitles } from '@/lib/use-tmdb';

/** Keeps the lists current: runs whenever the app opens and show details arrive. Renders nothing. */
export function ListAutomation() {
  const { shows, patchShows } = useStore();
  // Only shows that could change: everything in Waiting, plus anything the one-time tidy hasn't seen.
  const candidates = shows.filter((s) => s.list === 'waiting' || !s.tidied);
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
