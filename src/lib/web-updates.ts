import { useEffect } from 'react';
import { Platform } from 'react-native';

const ENTRY = /\/_expo\/static\/js\/web\/entry-[a-f0-9]+\.js/;

// Home-screen web apps on iPhone hold on to old pages, so after each publish the
// app checks whether a newer build is live and reloads itself into it.
async function reloadIfOutdated() {
  const running = [...document.scripts].map((s) => s.src.match(ENTRY)?.[0]).find(Boolean);
  if (!running) return; // dev server, nothing to compare
  try {
    const html = await (await fetch(`/?check=${Date.now()}`, { cache: 'no-store' })).text();
    const live = html.match(ENTRY)?.[0];
    if (!live || live === running) return;
    // Only try each new build once, so a stale edge cache can't cause a reload loop.
    if (sessionStorage.getItem('couchqueue:reloaded-for') === live) return;
    sessionStorage.setItem('couchqueue:reloaded-for', live);
    location.reload();
  } catch {
    // Offline: try again next time the app comes forward.
  }
}

export function useWebAutoUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    reloadIfOutdated();
    const onVisible = () => document.visibilityState === 'visible' && reloadIfOutdated();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
