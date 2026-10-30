-- Persistent creature health and server-owned battle turns.
alter table public.player_creatures
  add column current_hp integer not null default 100,
  add column max_hp integer not null default 100,
  add constraint player_creatures_hp_valid check (max_hp > 0 and current_hp between 0 and max_hp);

alter table public.battle_attempts
  add column active_creature_id uuid references public.player_creatures (id) on delete set null,
  add column turn_number integer not null default 0 check (turn_number >= 0),
  add column battle_outcome text check (battle_outcome in ('won', 'lost'));

-- Existing players receive a usable party without having to rebuild it manually.
insert into public.party_slots (user_id, slot, creature_id)
select user_id, slot, id from (
  select c.user_id, c.id,
    row_number() over (partition by c.user_id order by c.is_starter desc, c.caught_at, c.id)::integer as slot
  from public.player_creatures c
  where not exists (
    select 1 from public.party_slots ps
    where ps.user_id = c.user_id and ps.creature_id is not null
  )
) ranked
where slot <= 6
on conflict (user_id, slot) do nothing;

update public.inventory_items set
  effect = 'Revive one fainted Pokemon to half HP',
  is_active = true
where item_key = 'revive';
update public.inventory_items set
  effect = 'Revive one fainted Pokemon to full HP',
  is_active = true
where item_key = 'max-revive';

create or replace function public.set_party_slot(p_slot integer, p_creature_id uuid)
returns public.party_slots
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  updated_slot public.party_slots;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if p_slot is null or p_slot not between 1 and 6 then raise exception 'Party slot must be between 1 and 6'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text || ':party', 0));
  -- Editing the roster ends any unfinished encounter, so an abandoned tab cannot lock the party.
  update public.battle_attempts a set status = 'abandoned'::public.battle_status, updated_at = now()
  where a.user_id = current_user_id and a.status = 'running'::public.battle_status
    and a.energy_spent and a.battle_outcome is null;
  if p_creature_id is not null and not exists (
    select 1 from public.player_creatures c
    where c.id = p_creature_id and c.user_id = current_user_id
  ) then raise exception 'Creature is not in your collection'; end if;
  -- Moving a creature frees its old slot; the unique constraint prevents duplicates.
  update public.party_slots ps set creature_id = null
  where ps.user_id = current_user_id and ps.creature_id = p_creature_id and ps.slot <> p_slot;
  insert into public.party_slots (user_id, slot, creature_id)
  values (current_user_id, p_slot, p_creature_id)
  on conflict (user_id, slot) do update set creature_id = excluded.creature_id
  returning * into updated_slot;
  return updated_slot;
end;
$$;
revoke all on function public.set_party_slot(integer, uuid) from public;
grant execute on function public.set_party_slot(integer, uuid) to authenticated;

create or replace function app_private.use_healing_item(p_user_id uuid, p_creature_id uuid, p_item_key text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  creature public.player_creatures;
  restored_hp integer;
begin
  if p_item_key not in ('potion', 'super-potion', 'hyper-potion', 'max-potion', 'revive', 'max-revive') then
    raise exception 'Item cannot heal Pokemon';
  end if;
  select * into creature from public.player_creatures c
  where c.id = p_creature_id and c.user_id = p_user_id for update;
  if creature.id is null then raise exception 'Pokemon is not in your collection'; end if;
  if p_item_key in ('revive', 'max-revive') and creature.current_hp <> 0 then
    raise exception 'Revive only works on a fainted Pokemon';
  end if;
  if p_item_key not in ('revive', 'max-revive') and (creature.current_hp = 0 or creature.current_hp = creature.max_hp) then
    raise exception 'This Pokemon needs a Revive or is already at full HP';
  end if;
  update public.player_inventory i set quantity = i.quantity - 1, updated_at = now()
  where i.user_id = p_user_id and i.item_key = p_item_key and i.quantity > 0;
  if not found then raise exception 'No % left', p_item_key; end if;
  restored_hp := case p_item_key
    when 'potion' then least(creature.max_hp, creature.current_hp + 25)
    when 'super-potion' then least(creature.max_hp, creature.current_hp + 50)
    when 'hyper-potion' then least(creature.max_hp, creature.current_hp + 120)
    when 'max-potion' then creature.max_hp
    when 'revive' then greatest(1, creature.max_hp / 2)
    else creature.max_hp
  end;
  update public.player_creatures c set current_hp = restored_hp where c.id = creature.id;
  return restored_hp;
end;
$$;
revoke all on function app_private.use_healing_item(uuid, uuid, text) from public;

create or replace function public.use_healing_item(p_creature_id uuid, p_item_key text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if exists (
    select 1 from public.battle_attempts a
    where a.user_id = current_user_id and a.status = 'running'::public.battle_status
      and a.energy_spent and a.battle_outcome is null
  ) then raise exception 'Use the battle Bag while an encounter is active'; end if;
  return app_private.use_healing_item(current_user_id, p_creature_id, p_item_key);
end;
$$;
revoke all on function public.use_healing_item(uuid, text) from public;
grant execute on function public.use_healing_item(uuid, text) to authenticated;

create table app_private.battle_moves (
  name text primary key,
  move_type text not null,
  power integer not null check (power > 0),
  accuracy integer not null check (accuracy between 1 and 100)
);
insert into app_private.battle_moves (name, move_type, power, accuracy) values
  ('Tackle','Normal',40,100),('Quick Attack','Normal',40,100),
  ('Ember','Fire',40,100),('Flamethrower','Fire',90,100),
  ('Water Gun','Water',40,100),('Surf','Water',90,100),
  ('Thunder Shock','Electric',40,100),('Thunderbolt','Electric',90,100),
  ('Vine Whip','Grass',45,100),('Razor Leaf','Grass',55,95),
  ('Ice Beam','Ice',90,100),('Karate Chop','Fighting',50,100),
  ('Submission','Fighting',80,80),('Poison Sting','Poison',15,100),
  ('Sludge','Poison',65,100),('Dig','Ground',80,100),
  ('Earthquake','Ground',100,100),('Gust','Flying',40,100),
  ('Wing Attack','Flying',60,100),('Confusion','Psychic',50,100),
  ('Psychic','Psychic',90,100),('Leech Life','Bug',20,100),
  ('Twineedle','Bug',50,100),('Rock Throw','Rock',50,90),
  ('Rock Slide','Rock',75,90),('Lick','Ghost',30,100),
  ('Night Shade','Ghost',70,100),('Dragon Rage','Dragon',70,100);

create table app_private.battle_type_effectiveness (
  move_type text not null,
  defender_type text not null,
  multiplier numeric not null check (multiplier in (0, 0.5, 2)),
  primary key (move_type, defender_type)
);
insert into app_private.battle_type_effectiveness values
('Normal','Ghost',0),('Normal','Rock',0.5),
('Fire','Bug',2),('Fire','Grass',2),('Fire','Ice',2),('Fire','Dragon',0.5),('Fire','Fire',0.5),('Fire','Rock',0.5),('Fire','Water',0.5),
('Water','Fire',2),('Water','Ground',2),('Water','Rock',2),('Water','Dragon',0.5),('Water','Grass',0.5),('Water','Water',0.5),
('Electric','Flying',2),('Electric','Water',2),('Electric','Dragon',0.5),('Electric','Electric',0.5),('Electric','Grass',0.5),('Electric','Ground',0),
('Grass','Ground',2),('Grass','Rock',2),('Grass','Water',2),('Grass','Bug',0.5),('Grass','Dragon',0.5),('Grass','Fire',0.5),('Grass','Flying',0.5),('Grass','Grass',0.5),('Grass','Poison',0.5),
('Ice','Dragon',2),('Ice','Flying',2),('Ice','Grass',2),('Ice','Ground',2),('Ice','Fire',0.5),('Ice','Ice',0.5),('Ice','Water',0.5),
('Fighting','Ice',2),('Fighting','Normal',2),('Fighting','Rock',2),('Fighting','Bug',0.5),('Fighting','Flying',0.5),('Fighting','Poison',0.5),('Fighting','Psychic',0.5),('Fighting','Ghost',0),
('Poison','Bug',2),('Poison','Grass',2),('Poison','Ghost',0.5),('Poison','Ground',0.5),('Poison','Poison',0.5),('Poison','Rock',0.5),
('Ground','Electric',2),('Ground','Fire',2),('Ground','Poison',2),('Ground','Rock',2),('Ground','Bug',0.5),('Ground','Grass',0.5),('Ground','Flying',0),
('Flying','Bug',2),('Flying','Fighting',2),('Flying','Grass',2),('Flying','Electric',0.5),('Flying','Rock',0.5),
('Psychic','Fighting',2),('Psychic','Poison',2),('Psychic','Psychic',0.5),
('Bug','Grass',2),('Bug','Poison',2),('Bug','Psychic',2),('Bug','Fighting',0.5),('Bug','Fire',0.5),('Bug','Flying',0.5),('Bug','Ghost',0.5),
('Rock','Bug',2),('Rock','Fire',2),('Rock','Flying',2),('Rock','Ice',2),('Rock','Fighting',0.5),('Rock','Ground',0.5),
('Ghost','Ghost',2),('Ghost','Psychic',0),('Ghost','Normal',0),
('Dragon','Dragon',2);

create or replace function app_private.resolve_battle_move(
  p_attacker_types text[], p_defender_types text[], p_move_type text,
  p_power integer, p_accuracy integer
) returns jsonb language plpgsql set search_path = '' as $$
declare
  defender_type text;
  effectiveness numeric := 1;
  factor numeric;
  critical boolean;
  damage integer;
begin
  if random() * 100 >= p_accuracy then
    return jsonb_build_object('hit', false, 'damage', 0, 'critical', false, 'effectiveness', 1);
  end if;
  foreach defender_type in array p_defender_types loop
    select e.multiplier into factor from app_private.battle_type_effectiveness e
    where e.move_type = p_move_type and e.defender_type = defender_type;
    effectiveness := effectiveness * coalesce(factor, 1);
  end loop;
  critical := random() < 0.06;
  damage := case when effectiveness = 0 then 0 else greatest(1, round(
    (p_power * 0.32 + 8) *
    (case when p_move_type = any(p_attacker_types) then 1.5 else 1 end) *
    effectiveness * (case when critical then 1.7 else 1 end) *
    (0.9 + random() * 0.1)
  )::integer) end;
  return jsonb_build_object('hit', true, 'damage', damage,
    'critical', critical, 'effectiveness', effectiveness);
end;
$$;

create or replace function public.spend_battle_energy(p_battle_attempt_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  attempt public.battle_attempts;
  chosen public.player_creatures;
  remaining_energy integer;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text || ':party', 0));
  select * into attempt from public.battle_attempts a
  where a.id = p_battle_attempt_id and a.user_id = current_user_id for update;
  if attempt.id is null then raise exception 'Battle attempt not found'; end if;
  if attempt.sample_status <> 'passed'::public.test_group_status
    or attempt.hidden_status <> 'passed'::public.test_group_status
    or attempt.efficiency_status <> 'passed'::public.test_group_status then
    raise exception 'Solve the question before starting its battle';
  end if;
  if attempt.energy_spent then raise exception 'Battle energy was already spent for this attempt'; end if;
  select c.* into chosen from public.party_slots ps
  join public.player_creatures c on c.id = ps.creature_id and c.user_id = current_user_id
  where ps.user_id = current_user_id and c.current_hp > 0
  order by ps.slot limit 1 for update of c;
  if chosen.id is null then raise exception 'Your party has no healthy Pokemon. Use a Revive in your collection.'; end if;
  update public.player_resources r set energy = r.energy - 1, updated_at = now()
  where r.user_id = current_user_id and r.energy > 0
  returning r.energy into remaining_energy;
  if remaining_energy is null then raise exception 'Not enough energy to start a battle'; end if;
  update public.battle_attempts a set energy_spent = true,
    status = 'running'::public.battle_status,
    active_creature_id = chosen.id, player_hp = chosen.current_hp,
    enemy_hp = 100, turn_number = 0, battle_outcome = null, updated_at = now()
  where a.id = p_battle_attempt_id;
  return remaining_energy;
end;
$$;
revoke all on function public.spend_battle_energy(uuid) from public;
grant execute on function public.spend_battle_energy(uuid) to authenticated;

create or replace function public.take_battle_action(
  p_battle_attempt_id uuid,
  p_action text,
  p_move_name text,
  p_creature_id uuid,
  p_item_key text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  attempt public.battle_attempts;
  active_creature public.player_creatures;
  target_creature public.player_creatures;
  player_species public.pokemon_species;
  enemy_species public.pokemon_species;
  chosen_move app_private.battle_moves;
  outcome jsonb;
  events jsonb := '[]'::jsonb;
  next_enemy_hp integer;
  next_player_hp integer;
  next_outcome text := null;
  needs_switch boolean := false;
  forced_switch boolean := false;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if p_action not in ('move', 'switch', 'item') then raise exception 'Unknown battle action'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text || ':party', 0));
  select * into attempt from public.battle_attempts a
  where a.id = p_battle_attempt_id and a.user_id = current_user_id for update;
  if attempt.id is null or not attempt.energy_spent or attempt.status <> 'running'::public.battle_status
    or attempt.battle_outcome is not null then
    raise exception 'No active battle for this action';
  end if;
  select * into active_creature from public.player_creatures c
  where c.id = attempt.active_creature_id and c.user_id = current_user_id for update;
  if active_creature.id is null or not exists (
    select 1 from public.party_slots ps where ps.user_id = current_user_id
      and ps.creature_id = active_creature.id
  ) then raise exception 'Active Pokemon is not in your party'; end if;
  select * into player_species from public.pokemon_species s where s.pokemon_id = active_creature.pokemon_id;
  select * into enemy_species from public.pokemon_species s where s.pokemon_id = attempt.pokemon_id;
  next_enemy_hp := attempt.enemy_hp;
  next_player_hp := active_creature.current_hp;

  if p_action = 'switch' then
    if p_creature_id is null or p_creature_id = active_creature.id then
      raise exception 'Choose another party Pokemon';
    end if;
    select * into target_creature from public.player_creatures c
    where c.id = p_creature_id and c.user_id = current_user_id for update;
    if target_creature.id is null or target_creature.current_hp = 0 or not exists (
      select 1 from public.party_slots ps where ps.user_id = current_user_id
        and ps.creature_id = target_creature.id
    ) then raise exception 'That Pokemon cannot switch in'; end if;
    forced_switch := active_creature.current_hp = 0;
    events := events || jsonb_build_array(
      jsonb_build_object('type','switch_out','text',
        case when forced_switch then player_species.name || ' fainted!' else 'Come back, ' || player_species.name || '!' end),
      jsonb_build_object('type','switch_in','text','Go, ' ||
        (select s.name from public.pokemon_species s where s.pokemon_id = target_creature.pokemon_id) || '!'),
      jsonb_build_object('type','player_hp','value',target_creature.current_hp,'text','Ready to fight!')
    );
    update public.battle_attempts a set active_creature_id = target_creature.id,
      player_hp = target_creature.current_hp where a.id = attempt.id;
    active_creature := target_creature;
    select * into player_species from public.pokemon_species s where s.pokemon_id = active_creature.pokemon_id;
    next_player_hp := active_creature.current_hp;
  elsif p_action = 'item' then
    if active_creature.current_hp = 0 then raise exception 'Switch to a healthy Pokemon first'; end if;
    if p_creature_id is null or not exists (
      select 1 from public.party_slots ps where ps.user_id = current_user_id
        and ps.creature_id = p_creature_id
    ) then raise exception 'Item target must be in your party'; end if;
    next_player_hp := app_private.use_healing_item(current_user_id, p_creature_id, p_item_key);
    events := events || jsonb_build_array(jsonb_build_object('type','text','text',
      'Used ' || (select i.display_name from public.inventory_items i where i.item_key = p_item_key) || '!'));
    if p_creature_id = active_creature.id then
      update public.battle_attempts a set player_hp = next_player_hp where a.id = attempt.id;
      events := events || jsonb_build_array(jsonb_build_object('type','player_hp',
        'value',next_player_hp,'text',player_species.name || ' recovered HP!'));
    else
      next_player_hp := active_creature.current_hp;
    end if;
  else
    if active_creature.current_hp = 0 then raise exception 'Switch to a healthy Pokemon first'; end if;
    select * into chosen_move from app_private.battle_moves m
    where m.name = p_move_name and (m.move_type = any(player_species.types) or m.move_type = 'Normal');
    if chosen_move.name is null then raise exception 'Pokemon cannot use that move'; end if;
    outcome := app_private.resolve_battle_move(player_species.types, enemy_species.types,
      chosen_move.move_type, chosen_move.power, chosen_move.accuracy);
    next_enemy_hp := greatest(0, attempt.enemy_hp - (outcome->>'damage')::integer);
    events := events || jsonb_build_array(jsonb_build_object('type','player_attack',
      'text',player_species.name || ' used ' || chosen_move.name || '!',
      'animationId',regexp_replace(lower(chosen_move.name),'[^a-z0-9]+','-','g')));
    if (outcome->>'hit')::boolean and (outcome->>'damage')::integer > 0 then
      events := events || jsonb_build_array(jsonb_build_object('type','enemy_hit',
        'text',case when (outcome->>'effectiveness')::numeric > 1 then 'Super effective!'
          when (outcome->>'effectiveness')::numeric < 1 then 'Not very effective.'
          else 'A direct hit!' end,
        'damage',(outcome->>'damage')::integer,
        'critical',(outcome->>'critical')::boolean,
        'effectiveness',(outcome->>'effectiveness')::numeric));
    else
      events := events || jsonb_build_array(jsonb_build_object('type','text',
        'text',case when (outcome->>'hit')::boolean then 'It had no effect!'
          else player_species.name || '''s attack missed!' end));
    end if;
    events := events || jsonb_build_array(jsonb_build_object('type','enemy_hp',
      'value',next_enemy_hp,'text',enemy_species.name || ' has ' || next_enemy_hp || ' HP remaining.'));
    if next_enemy_hp = 0 then
      next_outcome := 'won';
      events := events || jsonb_build_array(
        jsonb_build_object('type','enemy_faint','text',enemy_species.name || ' fainted!'),
        jsonb_build_object('type','victory','text','Your party won the encounter!',
          'rewards',jsonb_build_object('xp',0,'coins',0))
      );
    end if;
  end if;

  if next_outcome is null and not forced_switch then
    select * into chosen_move from app_private.battle_moves m
    where m.move_type = any(enemy_species.types) or m.move_type = 'Normal'
    order by case when attempt.turn_number % 3 = 2 then m.power else -m.power end,
      m.name limit 1;
    outcome := app_private.resolve_battle_move(enemy_species.types, player_species.types,
      chosen_move.move_type, chosen_move.power, chosen_move.accuracy);
    next_player_hp := greatest(0, next_player_hp - round((outcome->>'damage')::numeric * 0.7)::integer);
    update public.player_creatures c set current_hp = next_player_hp where c.id = active_creature.id;
    events := events || jsonb_build_array(jsonb_build_object('type','enemy_attack',
      'text',enemy_species.name || ' used ' || chosen_move.name || '!',
      'animationId',regexp_replace(lower(chosen_move.name),'[^a-z0-9]+','-','g')));
    if (outcome->>'hit')::boolean and (outcome->>'damage')::integer > 0 then
      events := events || jsonb_build_array(jsonb_build_object('type','player_hit',
        'text',player_species.name || ' took damage!',
        'damage',round((outcome->>'damage')::numeric * 0.7)::integer,
        'critical',(outcome->>'critical')::boolean,
        'effectiveness',(outcome->>'effectiveness')::numeric));
    end if;
    events := events || jsonb_build_array(jsonb_build_object('type','player_hp',
      'value',next_player_hp,'text',case when next_player_hp = 0
        then player_species.name || ' fainted!' else player_species.name || ' has ' || next_player_hp || ' HP.' end));
    if next_player_hp = 0 then
      select exists (
        select 1 from public.party_slots ps
        join public.player_creatures c on c.id = ps.creature_id
        where ps.user_id = current_user_id and c.current_hp > 0
      ) into needs_switch;
      if not needs_switch then
        next_outcome := 'lost';
        events := events || jsonb_build_array(jsonb_build_object('type','defeat',
          'text','Your entire party fainted. Use Revives before the next battle.'));
      end if;
    end if;
  end if;

  update public.battle_attempts a set enemy_hp = next_enemy_hp,
    player_hp = next_player_hp, battle_outcome = next_outcome,
    turn_number = a.turn_number + 1, updated_at = now()
  where a.id = attempt.id;
  insert into public.battle_events (battle_attempt_id,user_id,sequence,event_type,payload)
  values (attempt.id,current_user_id,100 + attempt.turn_number,'battle_turn',
    jsonb_build_object('action',p_action,'events',events,'enemyHp',next_enemy_hp,
      'playerHp',next_player_hp,'outcome',next_outcome,'needsSwitch',needs_switch));
  return jsonb_build_object('events',events,'enemyHp',next_enemy_hp,
    'playerHp',next_player_hp,'activeCreatureId',active_creature.id,
    'outcome',next_outcome,'needsSwitch',needs_switch);
end;
$$;
revoke all on function public.take_battle_action(uuid,text,text,uuid,text) from public;
grant execute on function public.take_battle_action(uuid,text,text,uuid,text) to authenticated;

-- Keep solve rewards and validate final combat results against server-owned health.
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
  updated_attempt public.battle_attempts;
  already_solved boolean;
  solved_now boolean;
  previous_energy_awarded boolean;
  battle_energy_spent boolean;
  recorded_battle_outcome text;
  question_level public.question_difficulty;
  reward_coins integer := 45;
  reward_xp integer := 120;
  party_xp integer := 90;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if p_language not in ('python', 'javascript') then raise exception 'Unsupported language'; end if;
  if p_status = 'won'::public.battle_status and (
    p_sample_status <> 'passed'::public.test_group_status
    or p_hidden_status <> 'passed'::public.test_group_status
    or p_efficiency_status <> 'passed'::public.test_group_status
  ) then raise exception 'Cannot mark battle won until all checkpoints pass'; end if;

  select a.question_id, a.pokemon_id, a.status, a.solve_energy_awarded,
    a.energy_spent, a.battle_outcome
  into target_question_id, target_pokemon_id, previous_status,
    previous_energy_awarded, battle_energy_spent, recorded_battle_outcome
  from public.battle_attempts a
  where a.id = p_battle_attempt_id and a.user_id = current_user_id
  for update;
  if target_question_id is null then raise exception 'Battle attempt not found'; end if;
  if p_status in ('won'::public.battle_status, 'lost'::public.battle_status)
    and not battle_energy_spent then
    raise exception 'Spend energy before recording a battle result';
  end if;
  if p_status = 'won'::public.battle_status and recorded_battle_outcome is distinct from 'won' then
    raise exception 'Battle victory has not been confirmed by the server';
  end if;
  if p_status = 'lost'::public.battle_status and recorded_battle_outcome is distinct from 'lost' then
    raise exception 'Party defeat has not been confirmed by the server';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text || ':' || target_question_id, 0)
  );
  select exists (
    select 1 from public.battle_attempts a
    where a.user_id = current_user_id and a.question_id = target_question_id
      and a.id <> p_battle_attempt_id
      and a.sample_status = 'passed'::public.test_group_status
      and a.hidden_status = 'passed'::public.test_group_status
      and a.efficiency_status = 'passed'::public.test_group_status
  ) into already_solved;
  select q.difficulty into question_level
  from public.questions q where q.id = target_question_id;
  if question_level = 'easy'::public.question_difficulty then
    reward_coins := 20; reward_xp := 60; party_xp := 45;
  elsif question_level = 'hard'::public.question_difficulty then
    reward_coins := 90; reward_xp := 220; party_xp := 180;
  end if;
  solved_now := p_sample_status = 'passed'::public.test_group_status
    and p_hidden_status = 'passed'::public.test_group_status
    and p_efficiency_status = 'passed'::public.test_group_status;

  update public.battle_attempts a set
    language = p_language,
    code_draft = coalesce(p_code_draft, ''),
    sample_status = p_sample_status,
    hidden_status = p_hidden_status,
    efficiency_status = p_efficiency_status,
    solve_energy_awarded = a.solve_energy_awarded or (
      p_sample_status = 'passed'::public.test_group_status
      and p_hidden_status = 'passed'::public.test_group_status
      and p_efficiency_status = 'passed'::public.test_group_status
    ),
    status = case when previous_status = 'won'::public.battle_status
      then 'won'::public.battle_status else p_status end,
    player_hp = case when battle_energy_spent then a.player_hp else greatest(0, p_player_hp) end,
    enemy_hp = case when battle_energy_spent then a.enemy_hp else greatest(0, p_enemy_hp) end,
    updated_at = now()
  where a.id = p_battle_attempt_id and a.user_id = current_user_id
  returning * into updated_attempt;
  if updated_attempt.id is null then raise exception 'Battle attempt not found'; end if;

  perform app_private.mark_pokedex_seen(current_user_id, target_pokemon_id, target_question_id, p_battle_attempt_id);
  insert into public.battle_events (battle_attempt_id, user_id, sequence, event_type, payload)
  values (p_battle_attempt_id, current_user_id, 1, 'result_recorded', jsonb_build_object(
    'status', p_status,
    'sampleStatus', p_sample_status,
    'hiddenStatus', p_hidden_status,
    'efficiencyStatus', p_efficiency_status,
    'playerHp', updated_attempt.player_hp,
    'enemyHp', updated_attempt.enemy_hp
  ))
  on conflict (battle_attempt_id, sequence) do update set event_type = excluded.event_type, payload = excluded.payload;

  if solved_now and not already_solved and not previous_energy_awarded then
    insert into public.player_resources (user_id, coins, xp, energy, max_energy)
    values (current_user_id, 0, 0, 1, 50)
    on conflict (user_id) do update set
      energy = public.player_resources.energy + 1,
      max_energy = greatest(public.player_resources.max_energy, public.player_resources.energy + 1),
      updated_at = now();
  end if;

  if p_status = 'won'::public.battle_status
    and previous_status <> 'won'::public.battle_status
    and not already_solved then
    insert into public.player_resources (user_id, coins, xp, energy, max_energy)
    values (current_user_id, reward_coins, reward_xp, 0, 50)
    on conflict (user_id) do update set
      coins = public.player_resources.coins + excluded.coins,
      xp = public.player_resources.xp + excluded.xp,
      updated_at = now();

    update public.player_creatures c set xp = c.xp + party_xp
    where c.user_id = current_user_id and (
      c.id in (
        select ps.creature_id from public.party_slots ps
        where ps.user_id = current_user_id and ps.creature_id is not null
      ) or (
        not exists (select 1 from public.party_slots ps
          where ps.user_id = current_user_id and ps.creature_id is not null)
        and c.is_starter = true
      )
    );
    perform app_private.refresh_milestones(current_user_id);
  end if;

  return updated_attempt;
end;
$$;

revoke all on function public.record_battle_result(
  uuid, text, text, public.test_group_status, public.test_group_status,
  public.test_group_status, public.battle_status, integer, integer
) from public;
grant execute on function public.record_battle_result(
  uuid, text, text, public.test_group_status, public.test_group_status,
  public.test_group_status, public.battle_status, integer, integer
) to authenticated;

