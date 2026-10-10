-- Couch Queue phone alerts. Run once after schema.sql.
-- Phones store where to deliver alerts (save_push_subscription); the check-shows
-- function runs every few hours, compares each list with TMDB and sends alerts,
-- remembering each one in alerts_sent so nobody gets the same alert twice.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  household_code text not null references public.households (code) on delete cascade,
  member_id text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts_sent (
  household_code text not null references public.households (code) on delete cascade,
  show_key text not null,
  event text not null,
  sent_at timestamptz not null default now(),
  primary key (household_code, show_key, event)
);

-- No policies: only the functions below and the check-shows function (service role) touch these.
alter table public.push_subscriptions enable row level security;
alter table public.alerts_sent enable row level security;

create or replace function public.save_push_subscription(p_code text, p_member text, p_subscription jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.households where code = upper(p_code)) then
    raise exception 'No list uses that code';
  end if;
  if coalesce(p_subscription ->> 'endpoint', '') not like 'https://%' then
    raise exception 'Not a push subscription';
  end if;
  insert into public.push_subscriptions (endpoint, household_code, member_id, subscription)
  values (p_subscription ->> 'endpoint', upper(p_code), p_member, p_subscription)
  on conflict (endpoint) do update
    set household_code = excluded.household_code,
        member_id = excluded.member_id,
        subscription = excluded.subscription,
        updated_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint
$$;

grant execute on function public.save_push_subscription(text, text, jsonb) to anon;
grant execute on function public.delete_push_subscription(text) to anon;

-- Check every 3 hours.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('check-shows') where exists (select 1 from cron.job where jobname = 'check-shows');
select cron.schedule(
  'check-shows',
  '15 */3 * * *',
  $$ select net.http_post(
       url := 'https://nlbbfazqtohxqztarlii.supabase.co/functions/v1/check-shows',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
