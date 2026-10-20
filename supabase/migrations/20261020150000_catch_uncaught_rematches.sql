-- Allow catches after any won rematch until the species is owned.
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
  latest_attempt_status public.battle_status;
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

  -- Serialize catch requests for this player's species before checking ownership.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text || ':pokemon:' || p_pokemon_id::text, 0)
  );

  select battle_attempts.id, battle_attempts.status
  into won_battle_attempt_id, latest_attempt_status
  from public.battle_attempts
  where battle_attempts.user_id = current_user_id
    and battle_attempts.question_id = p_question_id
    and battle_attempts.pokemon_id = p_pokemon_id
  order by battle_attempts.created_at desc, battle_attempts.id desc
  limit 1;

  if won_battle_attempt_id is null or latest_attempt_status <> 'won'::public.battle_status then
    raise exception 'Win the encounter before throwing a ball';
  end if;

  -- A previously caught species cannot consume another ball or be caught again.
  if exists (
    select 1 from public.player_creatures
    where user_id = current_user_id and pokemon_id = p_pokemon_id
  ) or exists (
    select 1 from public.player_pokedex
    where user_id = current_user_id
      and pokemon_id = p_pokemon_id
      and status = 'caught'
  ) then
    raise exception 'You already own this Pokemon';
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
        and player_creatures.pokemon_id = p_pokemon_id
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


