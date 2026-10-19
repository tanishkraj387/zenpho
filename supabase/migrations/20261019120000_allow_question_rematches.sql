-- Previously solved questions can start and win a new battle. Only the first win pays rewards.
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
  already_won boolean;
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

  -- Serialize wins for this player and question across different attempts.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text || ':' || target_question_id, 0)
  );

  select exists (
    select 1 from public.battle_attempts
    where user_id = current_user_id
      and question_id = target_question_id
      and status = 'won'::public.battle_status
      and id <> p_battle_attempt_id
  ) into already_won;

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
    status = case when previous_status = 'won'::public.battle_status
      then 'won'::public.battle_status else p_status end,
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

  if p_status = 'won'::public.battle_status
    and previous_status <> 'won'::public.battle_status
    and not already_won then
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

  -- Rematches are combat only: never consume a ball or grant a catch.
  if (
    select count(*) from public.battle_attempts
    where user_id = current_user_id
      and question_id = p_question_id
      and status = 'won'::public.battle_status
  ) > 1 then
    raise exception 'Rematches cannot award catches';
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

