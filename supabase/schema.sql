-- Couch Queue shared list storage.
-- Run once in the Supabase SQL editor (Project > SQL Editor > New query).
--
-- Each household is one JSON document. Phones never touch the table directly:
-- they call get_household / put_household with their household code, and
-- put_household merges entry by entry (newest updatedAt wins), so two phones
-- editing at the same time don't overwrite each other.

create table if not exists public.households (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- No policies: the anon key can't read or list the table, only call the functions below.
alter table public.households enable row level security;

create or replace function public.merge_map(a jsonb, b jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
  from (
    select distinct on (k) k, v
    from (
      select key as k, value as v from jsonb_each(coalesce(a, '{}'::jsonb))
      union all
      select key, value from jsonb_each(coalesce(b, '{}'::jsonb))
    ) entries
    order by k, (v ->> 'updatedAt')::bigint desc nulls last
  ) newest
$$;

create or replace function public.get_household(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.households where code = upper(p_code)
$$;

create or replace function public.put_household(p_code text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(p_code);
  current_doc jsonb;
  merged jsonb;
begin
  if length(normalized) < 8 then
    raise exception 'Household codes are at least 8 characters';
  end if;

  select data into current_doc from public.households where code = normalized for update;

  merged := jsonb_build_object(
    'code', normalized,
    'members', public.merge_map(current_doc -> 'members', p_data -> 'members'),
    'shows', public.merge_map(current_doc -> 'shows', p_data -> 'shows'),
    'progress', public.merge_map(current_doc -> 'progress', p_data -> 'progress')
  );

  insert into public.households (code, data) values (normalized, merged)
  on conflict (code) do update set data = excluded.data, updated_at = now();

  return merged;
end;
$$;

revoke all on function public.merge_map(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.get_household(text) to anon;
grant execute on function public.put_household(text, jsonb) to anon;
