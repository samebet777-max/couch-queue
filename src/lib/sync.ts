// Shares the household list between phones through Supabase (see supabase/schema.sql).
// Without EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY the app still works,
// but the list lives on this phone only.

import type { Household } from './household';

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasSync = url.length > 0 && anonKey.length > 0;

async function rpc<T>(fn: string, body: object): Promise<T> {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** Returns null when no household has this code. */
export function fetchHousehold(code: string) {
  return rpc<Household | null>('get_household', { p_code: code });
}

/** Sends this phone's copy; the server merges it and returns the combined list. */
export function pushHousehold(household: Household) {
  return rpc<Household>('put_household', { p_code: household.code, p_data: household });
}
