// Runs every few hours (see supabase/alerts.sql): checks every household's shows against TMDB
// and sends phone alerts. Deploy with --no-verify-jwt; calling it extra times is harmless
// because each alert is recorded in alerts_sent and only sent once.
//
// Secrets: TMDB_TOKEN, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

import { alertsFor, dateIn, type Household, type MovieDetails, type Saved, type TvDetails } from './alerts.ts';

const TIME_ZONE = 'America/New_York';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'https://couch-queue.expo.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

type Subscription = { endpoint: string; household_code: string; member_id: string; subscription: webpush.PushSubscription };
type Message = { title: string; body: string; url: string; tag?: string };

async function tmdb(path: string) {
  const res = await fetch(`https://api.themoviedb.org/3${path}?language=en-US`, {
    headers: { Authorization: `Bearer ${Deno.env.get('TMDB_TOKEN')}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json();
}

/** Sends one alert; forgets phones that have turned alerts off or been reset. */
async function send(sub: Subscription, message: Message) {
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(message), { TTL: 60 * 60 * 24 });
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    console.error('push failed', status, (err as Error).message);
    return false;
  }
}

async function welcome(endpoint: string) {
  const { data } = await db.from('push_subscriptions').select('*').eq('endpoint', endpoint).maybeSingle();
  if (!data) return { sent: 0 };
  const ok = await send(data as Subscription, {
    title: 'Alerts are on',
    body: 'Couch Queue will tell you when your shows come back.',
    url: '/',
    tag: 'welcome',
  });
  return { sent: ok ? 1 : 0 };
}

async function checkAll() {
  const { data: subs, error } = await db.from('push_subscriptions').select('*');
  if (error) throw error;
  const byHousehold = new Map<string, Subscription[]>();
  for (const s of (subs ?? []) as Subscription[]) {
    byHousehold.set(s.household_code, [...(byHousehold.get(s.household_code) ?? []), s]);
  }
  if (byHousehold.size === 0) return { households: 0, sent: 0 };

  const { data: rows, error: hhError } = await db
    .from('households')
    .select('code, data')
    .in('code', [...byHousehold.keys()]);
  if (hhError) throw hhError;

  // One TMDB lookup per title, shared across households.
  const cache = new Map<string, TvDetails | MovieDetails | undefined>();
  const load = async (saved: Saved) => {
    const path = saved.kind === 'movie' ? `/movie/${saved.id}` : `/tv/${saved.id}`;
    if (!cache.has(path)) cache.set(path, await tmdb(path).catch((e) => (console.error(e.message), undefined)));
    return cache.get(path);
  };

  const today = dateIn(TIME_ZONE);
  let sent = 0;
  for (const row of rows ?? []) {
    const household = row.data as Household;
    const shows = Object.values(household.shows ?? {}).filter((s) => !s.removed && s.list !== 'done');
    await Promise.all(shows.map(load));
    const lookup = (_key: string, saved: Saved) =>
      cache.get(saved.kind === 'movie' ? `/movie/${saved.id}` : `/tv/${saved.id}`);

    for (const alert of alertsFor(household, lookup, today)) {
      // Record first: if two checks overlap, only one of them sends.
      const { data: fresh } = await db
        .from('alerts_sent')
        .upsert({ household_code: row.code, show_key: alert.showKey, event: alert.event }, { ignoreDuplicates: true })
        .select();
      if (!fresh?.length) continue;
      const targets = (byHousehold.get(row.code) ?? []).filter((s) => alert.members.includes(s.member_id));
      for (const sub of targets) {
        if (await send(sub, { title: alert.title, body: alert.body, url: alert.url, tag: `${alert.showKey}:${alert.event}` })) {
          sent++;
        }
      }
    }
  }
  return { households: rows?.length ?? 0, titles: cache.size, sent, today };
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const result = typeof body.welcome === 'string' ? await welcome(body.welcome) : await checkAll();
    return Response.json(result, { headers: CORS });
  } catch (err) {
    console.error(err);
    return Response.json({ error: (err as Error).message }, { status: 500, headers: CORS });
  }
});
