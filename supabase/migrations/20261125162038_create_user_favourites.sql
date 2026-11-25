-- Phase 4.3: apply manually in the intended project's SQL Editor, once.
-- Deliberately fail if the table already exists: never silently trust older policies.
begin;

create table public.favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id text not null,
  constraint favourites_pkey primary key (user_id, station_id),
  constraint favourites_station_id_valid check (
    char_length(station_id) between 1 and 256 and station_id = btrim(station_id)
  )
);

alter table public.favourites enable row level security;
alter table public.favourites force row level security;

-- Remove legacy/default privileges before granting only the three required operations.
revoke all on table public.favourites from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on table public.favourites to authenticated;

create policy favourites_select_own on public.favourites
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy favourites_insert_own on public.favourites
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy favourites_delete_own on public.favourites
  for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.favourites is
  'Per-user CityBikes station IDs only. Availability is read from CityBikes, never reserved.';

commit;
