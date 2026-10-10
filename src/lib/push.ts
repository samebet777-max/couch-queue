// Phone alerts through Web Push. The daily check (supabase/functions/check-shows) sends them;
// this file asks for permission and stores where to deliver them.
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { hasSync, rpc, supabaseUrl } from './sync';

const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type AlertState =
  | 'unavailable' // this browser or build can't do alerts
  | 'add-to-home' // iPhone Safari: only works from the home-screen icon
  | 'blocked' // the person said no in the system prompt
  | 'off'
  | 'on';

function supported() {
  return (
    Platform.OS === 'web' &&
    hasSync &&
    vapidKey.length > 0 &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function isIos() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function standalone() {
  return (
    (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true) ||
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
  );
}

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js');
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription, code: string, memberId: string) {
  await rpc('save_push_subscription', { p_code: code, p_member: memberId, p_subscription: sub.toJSON() });
}

async function readState(): Promise<AlertState> {
  if (Platform.OS === 'web' && isIos() && !standalone()) return 'add-to-home';
  if (!supported()) return 'unavailable';
  if (Notification.permission === 'denied') return 'blocked';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** Alert status for this phone, plus turning alerts on and off. Keeps the saved delivery address current. */
export function useAlerts(code: string | undefined, memberId: string | undefined) {
  const [state, setState] = useState<AlertState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    readState()
      .then(async (s) => {
        if (live) setState(s);
        // Re-save on every open so the server always has this phone's latest address and owner.
        const sub = s === 'on' ? await currentSubscription() : null;
        if (sub && code && memberId) await save(sub, code, memberId);
      })
      .catch(() => live && setState('unavailable'));
    return () => {
      live = false;
    };
  }, [code, memberId]);

  const turnOn = useCallback(async () => {
    if (!code || !memberId) return;
    setError('');
    try {
      // Must run straight from the tap: iPhone only shows the permission prompt for a direct tap.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }));
      await save(sub, code, memberId);
      setState('on');
      // A first alert right away, so you know it works.
      fetch(`${supabaseUrl}/functions/v1/check-shows`, {
        method: 'POST',
        // Plain text skips the browser's extra permission check; the function reads it as JSON anyway.
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ welcome: sub.endpoint }),
      }).catch(() => {});
    } catch (e) {
      setError(`Couldn’t turn on alerts: ${(e as Error).message}`);
    }
  }, [code, memberId]);

  const turnOff = useCallback(async () => {
    setError('');
    try {
      const sub = await currentSubscription();
      if (sub) {
        await rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState('off');
    } catch (e) {
      setError(`Couldn’t turn off alerts: ${(e as Error).message}`);
    }
  }, []);

  return { state, error, turnOn, turnOff };
}
