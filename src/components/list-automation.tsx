import { useEffect } from 'react';

import type { SavedShow } from '@/lib/household';
import { automaticChanges } from '@/lib/smart-lists';
import { useStore } from '@/lib/store';
import { useShows } from '@/lib/use-tmdb';

/** Keeps the lists current: runs whenever the app opens and show details arrive. Renders nothing. */
export function ListAutomation() {
  const { shows, patchShows } = useStore();
  // Only shows that could change: everything in Waiting, plus anything the one-time tidy hasn't seen.
  const candidates = shows.filter((s) => s.list === 'waiting' || !s.tidied);
  const details = useShows(candidates.map((s) => s.id));

  useEffect(() => {
    const patches: Record<number, Partial<SavedShow>> = {};
    for (const saved of candidates) {
      const show = details[saved.id];
      if (!show || show instanceof Error) continue;
      const change = automaticChanges(saved, show);
      if (change) patches[saved.id] = change;
    }
    if (Object.keys(patches).length) patchShows(patches);
  }, [details, candidates, patchShows]);

  return null;
}
