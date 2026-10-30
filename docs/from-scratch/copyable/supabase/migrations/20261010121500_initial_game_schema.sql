-- Zenpho initial game schema.
-- Frontend clients may read catalog data and their own player state.
-- Authoritative mutations for rewards, catches, inventory, and battle outcomes
-- are intentionally left to server-side code using trusted credentials.

create extension if not exists pgcrypto;

create schema if not exists app_private;

create type public.question_difficulty as enum ('easy', 'medium', 'hard');
create type public.question_topic as enum ('arrays', 'strings', 'graphs', 'trees', 'dp', 'math');
create type public.pokemon_rarity as enum ('common', 'uncommon', 'rare', 'legendary');
create type public.inventory_category as enum ('balls', 'healing', 'special');
create type public.battle_status as enum ('started', 'running', 'submitted', 'won', 'lost', 'abandoned');
create type public.test_group_status as enum ('pending', 'passed', 'failed');
create type public.catch_status as enum ('pending', 'caught', 'escaped');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_resources (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  xp integer not null default 0 check (xp >= 0),
  energy integer not null default 50 check (energy >= 0),
  max_energy integer not null default 50 check (max_energy > 0),
  updated_at timestamptz not null default now(),
  check (energy <= max_energy)
);

create table public.pokemon_species (
  pokemon_id integer primary key check (pokemon_id between 1 and 151),
  name text not null unique,
  types text[] not null check (array_length(types, 1) >= 1),
  rarity public.pokemon_rarity not null,
  is_legendary boolean not null default false
);

create table public.questions (
  id text primary key,
  title text not null,
  difficulty public.question_difficulty not null,
  topic public.question_topic not null,
  description text not null,
  examples jsonb not null default '[]'::jsonb,
  starter_code jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  item_key text primary key,
  display_name text not null,
  category public.inventory_category not null,
  price integer not null check (price >= 0),
  effect text not null,
  sprite_name text not null,
  is_active boolean not null default true
);

create table public.player_inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null references public.inventory_items (item_key),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table public.player_creatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pokemon_id integer not null references public.pokemon_species (pokemon_id),
  nickname text,
  level integer not null default 5 check (level > 0),
  xp integer not null default 0 check (xp >= 0),
  affinity public.question_topic,
  source_question_id text references public.questions (id),
  source text not null default 'unknown',
  is_starter boolean not null default false,
  caught_at timestamptz not null default now()
);

create table public.battle_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id),
  pokemon_id integer not null references public.pokemon_species (pokemon_id),
  status public.battle_status not null default 'started',
  language text not null check (language in ('python', 'javascript')),
  code_draft text not null default '',
  sample_status public.test_group_status not null default 'pending',
  hidden_status public.test_group_status not null default 'pending',
  efficiency_status public.test_group_status not null default 'pending',
  player_hp integer not null default 100 check (player_hp >= 0),
  enemy_hp integer not null default 100 check (enemy_hp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.battle_events (
  id bigint generated always as identity primary key,
  battle_attempt_id uuid not null references public.battle_attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (battle_attempt_id, sequence)
);

create table public.catch_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  battle_attempt_id uuid not null references public.battle_attempts (id) on delete cascade,
  pokemon_id integer not null references public.pokemon_species (pokemon_id),
  ball_item_key text not null references public.inventory_items (item_key),
  status public.catch_status not null default 'pending',
  roll integer check (roll between 0 and 99),
  threshold integer check (threshold between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.milestone_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  milestone_key text not null,
  progress integer not null default 0 check (progress >= 0),
  target integer not null check (target > 0),
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, milestone_key)
);

create index player_creatures_user_id_idx on public.player_creatures (user_id);
create index battle_attempts_user_id_created_at_idx on public.battle_attempts (user_id, created_at desc);
create index battle_events_user_id_attempt_idx on public.battle_events (user_id, battle_attempt_id, sequence);
create index catch_attempts_user_id_created_at_idx on public.catch_attempts (user_id, created_at desc);
create index milestone_progress_user_id_idx on public.milestone_progress (user_id);
create index questions_difficulty_topic_idx on public.questions (difficulty, topic) where is_active;
create index pokemon_species_rarity_idx on public.pokemon_species (rarity);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger player_resources_set_updated_at
before update on public.player_resources
for each row execute function app_private.set_updated_at();

create trigger player_inventory_set_updated_at
before update on public.player_inventory
for each row execute function app_private.set_updated_at();

create trigger battle_attempts_set_updated_at
before update on public.battle_attempts
for each row execute function app_private.set_updated_at();

create trigger milestone_progress_set_updated_at
before update on public.milestone_progress
for each row execute function app_private.set_updated_at();

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  safe_username text;
begin
  requested_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1),
    'Trainer'
  );
  safe_username := left(regexp_replace(requested_username, '\s+', '-', 'g'), 20);

  if char_length(safe_username) < 3 then
    safe_username := 'Trainer';
  end if;

  insert into public.profiles (id, username)
  values (new.id, safe_username);

  insert into public.player_resources (user_id, coins, xp, energy, max_energy)
  values (new.id, 0, 0, 50, 50);

  insert into public.player_inventory (user_id, item_key, quantity)
  select new.id, item_key, starting_quantity
  from (
    values
      ('poke-ball', 5),
      ('great-ball', 1),
      ('ultra-ball', 0),
      ('master-ball', 0),
      ('potion', 3),
      ('super-potion', 1),
      ('revive', 1)
  ) as starter_inventory(item_key, starting_quantity)
  where exists (
    select 1
    from public.inventory_items
    where inventory_items.item_key = starter_inventory.item_key
  );

  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public;
revoke all on function app_private.set_updated_at() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.player_resources enable row level security;
alter table public.pokemon_species enable row level security;
alter table public.questions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.player_inventory enable row level security;
alter table public.player_creatures enable row level security;
alter table public.battle_attempts enable row level security;
alter table public.battle_events enable row level security;
alter table public.catch_attempts enable row level security;
alter table public.milestone_progress enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.pokemon_species to anon, authenticated;
grant select on public.questions to anon, authenticated;
grant select on public.inventory_items to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.player_resources to authenticated;
grant select on public.player_inventory to authenticated;
grant select on public.player_creatures to authenticated;
grant select on public.battle_attempts to authenticated;
grant select on public.battle_events to authenticated;
grant select on public.catch_attempts to authenticated;
grant select on public.milestone_progress to authenticated;

create policy "Pokemon species are readable"
on public.pokemon_species
for select
to anon, authenticated
using (true);

create policy "Active questions are readable"
on public.questions
for select
to anon, authenticated
using (is_active);

create policy "Active inventory items are readable"
on public.inventory_items
for select
to anon, authenticated
using (is_active);

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view their own resources"
on public.player_resources
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own inventory"
on public.player_inventory
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own creatures"
on public.player_creatures
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own battle attempts"
on public.battle_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own battle events"
on public.battle_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own catch attempts"
on public.catch_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own milestone progress"
on public.milestone_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.inventory_items (item_key, display_name, category, price, effect, sprite_name)
values
  ('poke-ball', 'Poke Ball', 'balls', 20, 'Small catch bonus', 'poke-ball'),
  ('great-ball', 'Great Ball', 'balls', 45, 'Medium catch bonus', 'great-ball'),
  ('ultra-ball', 'Ultra Ball', 'balls', 90, 'Large catch bonus', 'ultra-ball'),
  ('master-ball', 'Master Ball', 'special', 999, 'Guaranteed catch', 'master-ball'),
  ('potion', 'Potion', 'healing', 25, 'Restore 25 HP', 'potion'),
  ('super-potion', 'Super Potion', 'healing', 55, 'Restore 50 HP', 'super-potion'),
  ('hyper-potion', 'Hyper Potion', 'healing', 85, 'Restore 120 HP', 'hyper-potion'),
  ('max-potion', 'Max Potion', 'healing', 120, 'Restore all HP', 'max-potion'),
  ('revive', 'Revive', 'healing', 80, 'Recover from 0 HP', 'revive'),
  ('max-revive', 'Max Revive', 'healing', 140, 'Recover all HP from 0 HP', 'max-revive'),
  ('rare-candy', 'Rare Candy', 'special', 140, 'Future XP boost', 'rare-candy')
on conflict (item_key) do nothing;
