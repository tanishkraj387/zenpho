-- Backend game systems for party slots, Pokedex state, milestones, and
-- server-authored battle/catch side effects.

do $$
begin
  create type public.pokedex_status as enum ('seen', 'caught');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.player_pokedex (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pokemon_id integer not null references public.pokemon_species (pokemon_id),
  status public.pokedex_status not null default 'seen',
  first_seen_at timestamptz not null default now(),
  caught_at timestamptz,
  source_question_id text references public.questions (id),
  last_battle_attempt_id uuid references public.battle_attempts (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, pokemon_id),
  check (status = 'seen'::public.pokedex_status or caught_at is not null)
);

create table if not exists public.party_slots (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot integer not null check (slot between 1 and 6),
  creature_id uuid references public.player_creatures (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  unique (user_id, creature_id)
);

create table if not exists public.milestone_catalog (
  milestone_key text primary key,
  title text not null,
  description text not null,
  target integer not null check (target > 0),
  metric text not null check (metric in ('wins', 'wins_easy', 'wins_medium', 'wins_hard_dp', 'caught')),
  reward_pokemon_id integer references public.pokemon_species (pokemon_id),
  reward_coins integer not null default 0 check (reward_coins >= 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  reward_item_key text references public.inventory_items (item_key),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_catalog (
  gym_key text primary key,
  title text not null,
  topic public.question_topic not null,
  required_wins integer not null default 3 check (required_wins > 0),
  reward_pokemon_id integer references public.pokemon_species (pokemon_id),
  reward_coins integer not null default 0 check (reward_coins >= 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_gym_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_key text not null references public.gym_catalog (gym_key),
  won_at timestamptz not null default now(),
  reward_claimed_at timestamptz,
  primary key (user_id, gym_key)
);

create index if not exists player_pokedex_user_status_idx
on public.player_pokedex (user_id, status, updated_at desc);

create index if not exists party_slots_user_slot_idx
on public.party_slots (user_id, slot);

create index if not exists milestone_catalog_active_idx
on public.milestone_catalog (is_active, metric);

create index if not exists gym_catalog_active_topic_idx
on public.gym_catalog (is_active, topic);

create index if not exists player_gym_badges_user_id_idx
on public.player_gym_badges (user_id, won_at desc);

create trigger player_pokedex_set_updated_at
before update on public.player_pokedex
for each row execute function app_private.set_updated_at();

create trigger party_slots_set_updated_at
before update on public.party_slots
for each row execute function app_private.set_updated_at();

create trigger milestone_catalog_set_updated_at
before update on public.milestone_catalog
for each row execute function app_private.set_updated_at();

create trigger gym_catalog_set_updated_at
before update on public.gym_catalog
for each row execute function app_private.set_updated_at();

alter table public.player_pokedex enable row level security;
alter table public.party_slots enable row level security;
alter table public.milestone_catalog enable row level security;
alter table public.gym_catalog enable row level security;
alter table public.player_gym_badges enable row level security;

revoke all on public.player_pokedex from anon, authenticated;
revoke all on public.party_slots from anon, authenticated;
revoke all on public.milestone_catalog from anon, authenticated;
revoke all on public.gym_catalog from anon, authenticated;
revoke all on public.player_gym_badges from anon, authenticated;

grant select on public.player_pokedex to authenticated;
grant select on public.party_slots to authenticated;
grant select on public.milestone_catalog to anon, authenticated;
grant select on public.gym_catalog to anon, authenticated;
grant select on public.player_gym_badges to authenticated;

drop policy if exists "Users can view their own Pokedex" on public.player_pokedex;
create policy "Users can view their own Pokedex"
on public.player_pokedex
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own party slots" on public.party_slots;
create policy "Users can view their own party slots"
on public.party_slots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Milestones are readable" on public.milestone_catalog;
create policy "Milestones are readable"
on public.milestone_catalog
for select
to anon, authenticated
using (is_active);

drop policy if exists "Gyms are readable" on public.gym_catalog;
create policy "Gyms are readable"
on public.gym_catalog
for select
to anon, authenticated
using (is_active);

drop policy if exists "Users can view their own gym badges" on public.player_gym_badges;
create policy "Users can view their own gym badges"
on public.player_gym_badges
for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.milestone_catalog (
  milestone_key,
  title,
  description,
  target,
  metric,
  reward_pokemon_id,
  reward_coins,
  reward_xp,
  reward_item_key,
  is_active
)
values
  ('first_win', 'First Clear', 'Win one question encounter.', 1, 'wins', 10, 25, 40, 'poke-ball', true),
  ('easy_5', 'Route Rookie', 'Win five easy encounters.', 5, 'wins_easy', 16, 60, 90, 'great-ball', true),
  ('medium_10', 'Route Ace', 'Win ten medium encounters.', 10, 'wins_medium', 133, 140, 180, 'ultra-ball', true),
  ('hard_dp_3', 'Memo Master', 'Win three hard DP encounters.', 3, 'wins_hard_dp', 147, 220, 300, 'ultra-ball', true),
  ('caught_10', 'Collector Badge', 'Catch ten Pokemon.', 10, 'caught', 143, 180, 220, 'great-ball', true)
on conflict (milestone_key) do update set
  title = excluded.title,
  description = excluded.description,
  target = excluded.target,
  metric = excluded.metric,
  reward_pokemon_id = excluded.reward_pokemon_id,
  reward_coins = excluded.reward_coins,
  reward_xp = excluded.reward_xp,
  reward_item_key = excluded.reward_item_key,
  is_active = excluded.is_active;

insert into public.gym_catalog (
  gym_key,
  title,
  topic,
  required_wins,
  reward_pokemon_id,
  reward_coins,
  reward_xp,
  is_active
)
values
  ('array_gym', 'Array Gym', 'arrays'::public.question_topic, 3, 54, 80, 120, true),
  ('string_gym', 'String Gym', 'strings'::public.question_topic, 3, 25, 80, 120, true),
  ('graph_gym', 'Graph Gym', 'graphs'::public.question_topic, 3, 92, 120, 180, true),
  ('tree_gym', 'Tree Gym', 'trees'::public.question_topic, 3, 143, 120, 180, true),
  ('dp_gym', 'DP Gym', 'dp'::public.question_topic, 3, 147, 180, 260, true),
  ('math_gym', 'Math Gym', 'math'::public.question_topic, 3, 74, 120, 180, true)
on conflict (gym_key) do update set
  title = excluded.title,
  topic = excluded.topic,
  required_wins = excluded.required_wins,
  reward_pokemon_id = excluded.reward_pokemon_id,
  reward_coins = excluded.reward_coins,
  reward_xp = excluded.reward_xp,
  is_active = excluded.is_active;

insert into public.milestone_progress (user_id, milestone_key, progress, target)
select profiles.id, milestone_catalog.milestone_key, 0, milestone_catalog.target
from public.profiles
cross join public.milestone_catalog
on conflict (user_id, milestone_key) do update set
  target = excluded.target;

create or replace function app_private.mark_pokedex_seen(
  p_user_id uuid,
  p_pokemon_id integer,
  p_question_id text,
  p_battle_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_pokedex (
    user_id,
    pokemon_id,
    status,
    source_question_id,
    last_battle_attempt_id
  )
  values (
    p_user_id,
    p_pokemon_id,
    'seen'::public.pokedex_status,
    p_question_id,
    p_battle_attempt_id
  )
  on conflict (user_id, pokemon_id) do update set
    source_question_id = coalesce(public.player_pokedex.source_question_id, excluded.source_question_id),
    last_battle_attempt_id = excluded.last_battle_attempt_id,
    status = case
      when public.player_pokedex.status = 'caught'::public.pokedex_status then public.player_pokedex.status
      else 'seen'::public.pokedex_status
    end;
end;
$$;

create or replace function app_private.mark_pokedex_caught(
  p_user_id uuid,
  p_pokemon_id integer,
  p_question_id text,
  p_battle_attempt_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_pokedex (
    user_id,
    pokemon_id,
    status,
    caught_at,
    source_question_id,
    last_battle_attempt_id
  )
  values (
    p_user_id,
    p_pokemon_id,
    'caught'::public.pokedex_status,
    now(),
    p_question_id,
    p_battle_attempt_id
  )
  on conflict (user_id, pokemon_id) do update set
    status = 'caught'::public.pokedex_status,
    caught_at = coalesce(public.player_pokedex.caught_at, now()),
    source_question_id = coalesce(public.player_pokedex.source_question_id, excluded.source_question_id),
    last_battle_attempt_id = excluded.last_battle_attempt_id;
end;
$$;

create or replace function app_private.refresh_milestones(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.milestone_progress (user_id, milestone_key, progress, target, completed_at)
  select
    p_user_id,
    milestone_catalog.milestone_key,
    case milestone_catalog.metric
      when 'wins' then (
        select count(distinct battle_attempts.question_id)::integer
        from public.battle_attempts
        where battle_attempts.user_id = p_user_id
          and battle_attempts.status = 'won'::public.battle_status
      )
      when 'wins_easy' then (
        select count(distinct battle_attempts.question_id)::integer
        from public.battle_attempts
        join public.questions on questions.id = battle_attempts.question_id
        where battle_attempts.user_id = p_user_id
          and battle_attempts.status = 'won'::public.battle_status
          and questions.difficulty = 'easy'::public.question_difficulty
      )
      when 'wins_medium' then (
        select count(distinct battle_attempts.question_id)::integer
        from public.battle_attempts
        join public.questions on questions.id = battle_attempts.question_id
        where battle_attempts.user_id = p_user_id
          and battle_attempts.status = 'won'::public.battle_status
          and questions.difficulty = 'medium'::public.question_difficulty
      )
      when 'wins_hard_dp' then (
        select count(distinct battle_attempts.question_id)::integer
        from public.battle_attempts
        join public.questions on questions.id = battle_attempts.question_id
        where battle_attempts.user_id = p_user_id
          and battle_attempts.status = 'won'::public.battle_status
          and questions.difficulty = 'hard'::public.question_difficulty
          and questions.topic = 'dp'::public.question_topic
      )
      when 'caught' then (
        select count(*)::integer
        from public.player_pokedex
        where player_pokedex.user_id = p_user_id
          and player_pokedex.status = 'caught'::public.pokedex_status
      )
      else 0
    end,
    milestone_catalog.target,
    case
      when (
        case milestone_catalog.metric
          when 'wins' then (
            select count(distinct battle_attempts.question_id)::integer
            from public.battle_attempts
            where battle_attempts.user_id = p_user_id
              and battle_attempts.status = 'won'::public.battle_status
          )
          when 'wins_easy' then (
            select count(distinct battle_attempts.question_id)::integer
            from public.battle_attempts
            join public.questions on questions.id = battle_attempts.question_id
            where battle_attempts.user_id = p_user_id
              and battle_attempts.status = 'won'::public.battle_status
              and questions.difficulty = 'easy'::public.question_difficulty
          )
          when 'wins_medium' then (
            select count(distinct battle_attempts.question_id)::integer
            from public.battle_attempts
            join public.questions on questions.id = battle_attempts.question_id
            where battle_attempts.user_id = p_user_id
              and battle_attempts.status = 'won'::public.battle_status
              and questions.difficulty = 'medium'::public.question_difficulty
          )
          when 'wins_hard_dp' then (
            select count(distinct battle_attempts.question_id)::integer
            from public.battle_attempts
            join public.questions on questions.id = battle_attempts.question_id
            where battle_attempts.user_id = p_user_id
              and battle_attempts.status = 'won'::public.battle_status
              and questions.difficulty = 'hard'::public.question_difficulty
              and questions.topic = 'dp'::public.question_topic
          )
          when 'caught' then (
            select count(*)::integer
            from public.player_pokedex
            where player_pokedex.user_id = p_user_id
              and player_pokedex.status = 'caught'::public.pokedex_status
          )
          else 0
        end
      ) >= milestone_catalog.target then now()
      else null
    end
  from public.milestone_catalog
  where milestone_catalog.is_active
  on conflict (user_id, milestone_key) do update set
    progress = excluded.progress,
    target = excluded.target,
    completed_at = coalesce(public.milestone_progress.completed_at, excluded.completed_at);
end;
$$;

create or replace function public.choose_starter(selected_pokemon_id integer)
returns public.player_creatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  inserted_creature public.player_creatures;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if selected_pokemon_id not in (1, 4, 7) then
    raise exception 'Invalid starter Pokemon';
  end if;

  if exists (
    select 1
    from public.player_creatures
    where user_id = current_user_id
      and is_starter
  ) then
    raise exception 'Starter already selected';
  end if;

  insert into public.player_creatures (
    user_id,
    pokemon_id,
    level,
    xp,
    affinity,
    source,
    is_starter
  )
  values (
    current_user_id,
    selected_pokemon_id,
    5,
    0,
    case selected_pokemon_id
      when 1 then 'arrays'::public.question_topic
      when 4 then 'strings'::public.question_topic
      else 'graphs'::public.question_topic
    end,
    'starter choice',
    true
  )
  returning * into inserted_creature;

  insert into public.party_slots (user_id, slot, creature_id)
  values (current_user_id, 1, inserted_creature.id)
  on conflict (user_id, slot) do update set creature_id = excluded.creature_id;

  perform app_private.mark_pokedex_caught(current_user_id, selected_pokemon_id, null, null);
  perform app_private.refresh_milestones(current_user_id);

  return inserted_creature;
end;
$$;

revoke all on function public.choose_starter(integer) from public;
grant execute on function public.choose_starter(integer) to authenticated;

create or replace function public.set_party_slot(
  p_slot integer,
  p_creature_id uuid
)
returns public.party_slots
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  owns_creature boolean;
  updated_slot public.party_slots;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_slot < 1 or p_slot > 6 then
    raise exception 'Party slot must be between 1 and 6';
  end if;

  if p_creature_id is not null then
    select exists (
      select 1
      from public.player_creatures
      where player_creatures.id = p_creature_id
        and player_creatures.user_id = current_user_id
    )
    into owns_creature;

    if not owns_creature then
      raise exception 'Creature is not in your collection';
    end if;
  end if;

  insert into public.party_slots (user_id, slot, creature_id)
  values (current_user_id, p_slot, p_creature_id)
  on conflict (user_id, slot) do update set creature_id = excluded.creature_id
  returning * into updated_slot;

  return updated_slot;
end;
$$;

revoke all on function public.set_party_slot(integer, uuid) from public;
grant execute on function public.set_party_slot(integer, uuid) to authenticated;

create or replace function public.start_battle(
  p_question_id text,
  p_pokemon_id integer,
  p_language text
)
returns public.battle_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  expected_pokemon_id integer;
  inserted_attempt public.battle_attempts;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_language not in ('python', 'javascript') then
    raise exception 'Unsupported language';
  end if;

  select questions.encounter_pokemon_id
  into expected_pokemon_id
  from public.questions
  where questions.id = p_question_id
    and questions.is_active;

  if expected_pokemon_id is null then
    raise exception 'Question is not available';
  end if;

  if expected_pokemon_id <> p_pokemon_id then
    raise exception 'Encounter does not match this question';
  end if;

  if exists (
    select 1
    from public.battle_attempts
    where battle_attempts.user_id = current_user_id
      and battle_attempts.question_id = p_question_id
      and battle_attempts.status = 'won'::public.battle_status
  ) then
    raise exception 'Question already solved';
  end if;

  insert into public.battle_attempts (
    user_id,
    question_id,
    pokemon_id,
    status,
    language,
    code_draft
  )
  values (
    current_user_id,
    p_question_id,
    p_pokemon_id,
    'started'::public.battle_status,
    p_language,
    ''
  )
  returning * into inserted_attempt;

  perform app_private.mark_pokedex_seen(current_user_id, p_pokemon_id, p_question_id, inserted_attempt.id);

  insert into public.battle_events (battle_attempt_id, user_id, sequence, event_type, payload)
  values (
    inserted_attempt.id,
    current_user_id,
    0,
    'encounter_started',
    jsonb_build_object('questionId', p_question_id, 'pokemonId', p_pokemon_id)
  )
  on conflict (battle_attempt_id, sequence) do nothing;

  return inserted_attempt;
end;
$$;

revoke all on function public.start_battle(text, integer, text) from public;
grant execute on function public.start_battle(text, integer, text) to authenticated;

create or replace function public.record_battle_result(
  p_battle_attempt_id uuid,
  p_language text,
  p_code_draft text,
  p_sample_status public.test_group_status,
  p_hidden_status public.test_group_status,
  p_efficiency_status public.test_group_status,
  p_status public.battle_status,
  p_player_hp integer,
  p_enemy_hp integer
)
returns public.battle_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  target_question_id text;
  target_pokemon_id integer;
  previous_status public.battle_status;
  question_level public.question_difficulty;
  reward_coins integer := 45;
  reward_xp integer := 120;
  reward_energy integer := 34;
  party_xp integer := 90;
  updated_attempt public.battle_attempts;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_language not in ('python', 'javascript') then
    raise exception 'Unsupported language';
  end if;

  if p_status = 'won'::public.battle_status and (
    p_sample_status <> 'passed'::public.test_group_status
    or p_hidden_status <> 'passed'::public.test_group_status
    or p_efficiency_status <> 'passed'::public.test_group_status
  ) then
    raise exception 'Cannot mark battle won until all checkpoints pass';
  end if;

  select battle_attempts.question_id, battle_attempts.pokemon_id, battle_attempts.status
  into target_question_id, target_pokemon_id, previous_status
  from public.battle_attempts
  where battle_attempts.id = p_battle_attempt_id
    and battle_attempts.user_id = current_user_id
  for update;

  if target_question_id is null then
    raise exception 'Battle attempt not found';
  end if;

  if p_status = 'won'::public.battle_status and exists (
    select 1
    from public.battle_attempts
    where battle_attempts.user_id = current_user_id
      and battle_attempts.question_id = target_question_id
      and battle_attempts.status = 'won'::public.battle_status
      and battle_attempts.id <> p_battle_attempt_id
  ) then
    raise exception 'Question already solved';
  end if;

  select questions.difficulty
  into question_level
  from public.questions
  where questions.id = target_question_id;

  if question_level = 'easy'::public.question_difficulty then
    reward_coins := 20;
    reward_xp := 60;
    reward_energy := 24;
    party_xp := 45;
  elsif question_level = 'hard'::public.question_difficulty then
    reward_coins := 90;
    reward_xp := 220;
    reward_energy := 44;
    party_xp := 180;
  end if;

  update public.battle_attempts
  set
    language = p_language,
    code_draft = coalesce(p_code_draft, ''),
    sample_status = p_sample_status,
    hidden_status = p_hidden_status,
    efficiency_status = p_efficiency_status,
    status = p_status,
    player_hp = greatest(0, p_player_hp),
    enemy_hp = greatest(0, p_enemy_hp),
    updated_at = now()
  where battle_attempts.id = p_battle_attempt_id
    and battle_attempts.user_id = current_user_id
  returning * into updated_attempt;

  if updated_attempt.id is null then
    raise exception 'Battle attempt not found';
  end if;

  perform app_private.mark_pokedex_seen(current_user_id, target_pokemon_id, target_question_id, p_battle_attempt_id);

  insert into public.battle_events (battle_attempt_id, user_id, sequence, event_type, payload)
  values (
    p_battle_attempt_id,
    current_user_id,
    1,
    'result_recorded',
    jsonb_build_object(
      'status', p_status,
      'sampleStatus', p_sample_status,
      'hiddenStatus', p_hidden_status,
      'efficiencyStatus', p_efficiency_status,
      'playerHp', greatest(0, p_player_hp),
      'enemyHp', greatest(0, p_enemy_hp)
    )
  )
  on conflict (battle_attempt_id, sequence) do update set
    event_type = excluded.event_type,
    payload = excluded.payload;

  if p_status = 'won'::public.battle_status and previous_status <> 'won'::public.battle_status then
    insert into public.player_resources (user_id, coins, xp, energy, max_energy)
    values (current_user_id, reward_coins, reward_xp, reward_energy, 50)
    on conflict (user_id) do update
    set
      coins = public.player_resources.coins + excluded.coins,
      xp = public.player_resources.xp + excluded.xp,
      energy = least(public.player_resources.max_energy, public.player_resources.energy + excluded.energy),
      updated_at = now();

    update public.player_creatures
    set xp = player_creatures.xp + party_xp
    where player_creatures.user_id = current_user_id
      and (
        player_creatures.id in (
          select party_slots.creature_id
          from public.party_slots
          where party_slots.user_id = current_user_id
            and party_slots.creature_id is not null
        )
        or (
          not exists (
            select 1
            from public.party_slots
            where party_slots.user_id = current_user_id
              and party_slots.creature_id is not null
          )
          and player_creatures.is_starter = true
        )
      );

    perform app_private.refresh_milestones(current_user_id);
  end if;

  return updated_attempt;
end;
$$;

revoke all on function public.record_battle_result(
  uuid,
  text,
  text,
  public.test_group_status,
  public.test_group_status,
  public.test_group_status,
  public.battle_status,
  integer,
  integer
) from public;

grant execute on function public.record_battle_result(
  uuid,
  text,
  text,
  public.test_group_status,
  public.test_group_status,
  public.test_group_status,
  public.battle_status,
  integer,
  integer
) to authenticated;

create or replace function public.catch_pokemon(
  p_question_id text,
  p_pokemon_id integer,
  p_ball_item_key text
)
returns table (
  caught boolean,
  roll integer,
  threshold integer,
  quantity integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  item_category public.inventory_category;
  pokemon_rarity public.pokemon_rarity;
  question_difficulty public.question_difficulty;
  expected_pokemon_id integer;
  won_battle_attempt_id uuid;
  ball_bonus integer;
  rarity_penalty integer;
  difficulty_penalty integer;
  next_quantity integer;
  catch_roll integer;
  catch_threshold integer;
  did_catch boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select questions.difficulty, questions.encounter_pokemon_id
  into question_difficulty, expected_pokemon_id
  from public.questions
  where questions.id = p_question_id
    and questions.is_active;

  if question_difficulty is null or expected_pokemon_id is null then
    raise exception 'Question is not available';
  end if;

  if expected_pokemon_id <> p_pokemon_id then
    raise exception 'Encounter does not match this question';
  end if;

  select battle_attempts.id
  into won_battle_attempt_id
  from public.battle_attempts
  where battle_attempts.user_id = current_user_id
    and battle_attempts.question_id = p_question_id
    and battle_attempts.pokemon_id = p_pokemon_id
    and battle_attempts.status = 'won'::public.battle_status
  order by battle_attempts.updated_at desc
  limit 1;

  if won_battle_attempt_id is null then
    raise exception 'Win the encounter before throwing a ball';
  end if;

  select inventory_items.category
  into item_category
  from public.inventory_items
  where inventory_items.item_key = p_ball_item_key
    and inventory_items.is_active;

  if item_category is null or (
    item_category <> 'balls'::public.inventory_category
    and p_ball_item_key <> 'master-ball'
  ) then
    raise exception 'Selected item is not a ball';
  end if;

  select pokemon_species.rarity
  into pokemon_rarity
  from public.pokemon_species
  where pokemon_species.pokemon_id = p_pokemon_id;

  if pokemon_rarity is null then
    raise exception 'Pokemon is not available';
  end if;

  update public.player_inventory
  set quantity = player_inventory.quantity - 1
  where player_inventory.user_id = current_user_id
    and player_inventory.item_key = p_ball_item_key
    and player_inventory.quantity > 0
  returning player_inventory.quantity into next_quantity;

  if next_quantity is null then
    raise exception 'No balls left';
  end if;

  ball_bonus := case p_ball_item_key
    when 'master-ball' then 100
    when 'ultra-ball' then 36
    when 'great-ball' then 24
    else 12
  end;

  rarity_penalty := case pokemon_rarity
    when 'legendary' then 45
    when 'rare' then 24
    when 'uncommon' then 12
    else 0
  end;

  difficulty_penalty := case question_difficulty
    when 'hard' then 12
    when 'medium' then 6
    else 0
  end;

  catch_threshold := greatest(18, least(100, 68 + ball_bonus - rarity_penalty - difficulty_penalty));
  catch_roll := mod(abs(hashtext(current_user_id::text || ':' || p_question_id || ':' || p_pokemon_id::text || ':' || p_ball_item_key || ':' || now()::text)), 100);
  did_catch := p_ball_item_key = 'master-ball' or catch_roll < catch_threshold;

  insert into public.catch_attempts (
    user_id,
    battle_attempt_id,
    pokemon_id,
    ball_item_key,
    status,
    roll,
    threshold
  )
  values (
    current_user_id,
    won_battle_attempt_id,
    p_pokemon_id,
    p_ball_item_key,
    case when did_catch then 'caught'::public.catch_status else 'escaped'::public.catch_status end,
    catch_roll,
    catch_threshold
  );

  if did_catch then
    if not exists (
      select 1
      from public.player_creatures
      where player_creatures.user_id = current_user_id
        and player_creatures.source_question_id = p_question_id
    ) then
      insert into public.player_creatures (
        user_id,
        pokemon_id,
        level,
        xp,
        affinity,
        source_question_id,
        source,
        is_starter
      )
      values (
        current_user_id,
        p_pokemon_id,
        5,
        0,
        (select questions.topic from public.questions where questions.id = p_question_id),
        p_question_id,
        'question encounter',
        false
      );
    end if;

    perform app_private.mark_pokedex_caught(current_user_id, p_pokemon_id, p_question_id, won_battle_attempt_id);
  else
    perform app_private.mark_pokedex_seen(current_user_id, p_pokemon_id, p_question_id, won_battle_attempt_id);
  end if;

  perform app_private.refresh_milestones(current_user_id);

  caught := did_catch;
  roll := catch_roll;
  threshold := catch_threshold;
  quantity := next_quantity;
  return next;
end;
$$;

revoke all on function public.catch_pokemon(text, integer, text) from public;
grant execute on function public.catch_pokemon(text, integer, text) to authenticated;

create or replace function public.claim_milestone_reward(p_milestone_key text)
returns public.milestone_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  milestone public.milestone_catalog;
  progress_row public.milestone_progress;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform app_private.refresh_milestones(current_user_id);

  select *
  into milestone
  from public.milestone_catalog
  where milestone_catalog.milestone_key = p_milestone_key
    and milestone_catalog.is_active;

  if milestone.milestone_key is null then
    raise exception 'Milestone is not available';
  end if;

  select *
  into progress_row
  from public.milestone_progress
  where milestone_progress.user_id = current_user_id
    and milestone_progress.milestone_key = p_milestone_key
  for update;

  if progress_row.completed_at is null or progress_row.progress < progress_row.target then
    raise exception 'Milestone is not complete';
  end if;

  if progress_row.reward_claimed_at is not null then
    raise exception 'Milestone reward already claimed';
  end if;

  if milestone.reward_coins > 0 or milestone.reward_xp > 0 then
    insert into public.player_resources (user_id, coins, xp, energy, max_energy)
    values (current_user_id, milestone.reward_coins, milestone.reward_xp, 0, 50)
    on conflict (user_id) do update set
      coins = public.player_resources.coins + excluded.coins,
      xp = public.player_resources.xp + excluded.xp,
      updated_at = now();
  end if;

  if milestone.reward_item_key is not null then
    insert into public.player_inventory (user_id, item_key, quantity)
    values (current_user_id, milestone.reward_item_key, 1)
    on conflict (user_id, item_key) do update set
      quantity = public.player_inventory.quantity + 1,
      updated_at = now();
  end if;

  if milestone.reward_pokemon_id is not null then
    insert into public.player_creatures (
      user_id,
      pokemon_id,
      level,
      xp,
      source,
      is_starter
    )
    values (
      current_user_id,
      milestone.reward_pokemon_id,
      5,
      0,
      'milestone: ' || milestone.milestone_key,
      false
    );

    perform app_private.mark_pokedex_caught(current_user_id, milestone.reward_pokemon_id, null, null);
  end if;

  update public.milestone_progress
  set reward_claimed_at = now()
  where milestone_progress.user_id = current_user_id
    and milestone_progress.milestone_key = p_milestone_key
  returning * into progress_row;

  return progress_row;
end;
$$;

revoke all on function public.claim_milestone_reward(text) from public;
grant execute on function public.claim_milestone_reward(text) to authenticated;

create or replace function public.claim_gym_reward(p_gym_key text)
returns public.player_gym_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  gym public.gym_catalog;
  topic_wins integer;
  badge_row public.player_gym_badges;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into gym
  from public.gym_catalog
  where gym_catalog.gym_key = p_gym_key
    and gym_catalog.is_active;

  if gym.gym_key is null then
    raise exception 'Gym is not available';
  end if;

  select count(distinct battle_attempts.question_id)::integer
  into topic_wins
  from public.battle_attempts
  join public.questions on questions.id = battle_attempts.question_id
  where battle_attempts.user_id = current_user_id
    and battle_attempts.status = 'won'::public.battle_status
    and questions.topic = gym.topic;

  if topic_wins < gym.required_wins then
    raise exception 'Not enough topic wins for this gym';
  end if;

  insert into public.player_gym_badges (user_id, gym_key)
  values (current_user_id, p_gym_key)
  on conflict (user_id, gym_key) do nothing;

  select *
  into badge_row
  from public.player_gym_badges
  where player_gym_badges.user_id = current_user_id
    and player_gym_badges.gym_key = p_gym_key
  for update;

  if badge_row.reward_claimed_at is not null then
    raise exception 'Gym reward already claimed';
  end if;

  if gym.reward_coins > 0 or gym.reward_xp > 0 then
    insert into public.player_resources (user_id, coins, xp, energy, max_energy)
    values (current_user_id, gym.reward_coins, gym.reward_xp, 0, 50)
    on conflict (user_id) do update set
      coins = public.player_resources.coins + excluded.coins,
      xp = public.player_resources.xp + excluded.xp,
      updated_at = now();
  end if;

  if gym.reward_pokemon_id is not null then
    insert into public.player_creatures (
      user_id,
      pokemon_id,
      level,
      xp,
      affinity,
      source,
      is_starter
    )
    values (
      current_user_id,
      gym.reward_pokemon_id,
      8,
      0,
      gym.topic,
      'gym: ' || gym.gym_key,
      false
    );

    perform app_private.mark_pokedex_caught(current_user_id, gym.reward_pokemon_id, null, null);
  end if;

  update public.player_gym_badges
  set reward_claimed_at = now()
  where player_gym_badges.user_id = current_user_id
    and player_gym_badges.gym_key = p_gym_key
  returning * into badge_row;

  perform app_private.refresh_milestones(current_user_id);

  return badge_row;
end;
$$;

revoke all on function public.claim_gym_reward(text) from public;
grant execute on function public.claim_gym_reward(text) to authenticated;

revoke all on function app_private.mark_pokedex_seen(uuid, integer, text, uuid) from public;
revoke all on function app_private.mark_pokedex_caught(uuid, integer, text, uuid) from public;
revoke all on function app_private.refresh_milestones(uuid) from public;
