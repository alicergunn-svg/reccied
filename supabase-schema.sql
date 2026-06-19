-- ─────────────────────────────────────────────────────────────────────────────
-- Reccied — paste this entire file into Supabase SQL Editor and click Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles ────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  username    text unique not null,
  display_name text,
  bio         text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '', 'g'));
  final_username := base_username;
  loop
    exit when not exists (select 1 from profiles where username = final_username);
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;
  insert into profiles (id, email, username, display_name)
  values (new.id, new.email, final_username, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Places ──────────────────────────────────────────────────────────────────────
-- A place is the property itself. Multiple people can reccie the same place.
create table if not exists places (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  url            text not null,
  url_hash       text unique not null, -- normalised URL for deduplication
  name           text not null,
  location       text not null,
  lat            double precision,
  lng            double precision,
  cost_per_night numeric(10,2),
  sleeps         integer,
  dog_friendly   boolean,
  images         text[] default '{}'
);

-- Reccies ─────────────────────────────────────────────────────────────────────
-- A reccie is a person's recommendation of a place.
-- type = 'reccie' means they've stayed there. type = 'save' means aspirational.
create table if not exists reccies (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  user_id               uuid references profiles(id) on delete cascade not null,
  place_id              uuid references places(id) on delete cascade not null,
  type                  text not null default 'reccie' check (type in ('reccie', 'save')),
  what_made_it_special  text,
  who_would_love_it     text,
  best_tip              text,
  what_to_do_nearby     text,
  save_note             text,
  is_public             boolean default true,
  unique(user_id, place_id)
);

-- Follows ─────────────────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id  uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table places   enable row level security;
alter table reccies  enable row level security;
alter table follows  enable row level security;

-- Profiles: readable by all, editable by owner
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Places: readable by all (they're just property data)
create policy "places_select" on places for select using (true);
create policy "places_insert" on places for insert with check (auth.role() = 'authenticated');

-- Reccies: public ones readable by all; private only by owner
create policy "reccies_select" on reccies for select
  using (is_public = true or auth.uid() = user_id);
create policy "reccies_insert" on reccies for insert
  with check (auth.uid() = user_id);
create policy "reccies_update" on reccies for update
  using (auth.uid() = user_id);
create policy "reccies_delete" on reccies for delete
  using (auth.uid() = user_id);

-- Follows: readable by all, managed by owner
create policy "follows_select"  on follows for select using (true);
create policy "follows_insert"  on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete"  on follows for delete using (auth.uid() = follower_id);
