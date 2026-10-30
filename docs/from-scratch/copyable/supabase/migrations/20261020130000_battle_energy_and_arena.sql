alter table public.battle_attempts
  add column energy_spent boolean not null default false,
  add column solve_energy_awarded boolean not null default false;

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

  select a.question_id, a.pokemon_id, a.status, a.solve_energy_awarded, a.energy_spent
  into target_question_id, target_pokemon_id, previous_status, previous_energy_awarded, battle_energy_spent
  from public.battle_attempts a
  where a.id = p_battle_attempt_id and a.user_id = current_user_id
  for update;
  if target_question_id is null then raise exception 'Battle attempt not found'; end if;
  if p_status in ('won'::public.battle_status, 'lost'::public.battle_status)
    and not battle_energy_spent then
    raise exception 'Spend energy before recording a battle result';
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
    player_hp = greatest(0, p_player_hp),
    enemy_hp = greatest(0, p_enemy_hp),
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
    'playerHp', greatest(0, p_player_hp),
    'enemyHp', greatest(0, p_enemy_hp)
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

create or replace function public.spend_battle_energy(p_battle_attempt_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  attempt public.battle_attempts;
  remaining_energy integer;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;

  select * into attempt
  from public.battle_attempts a
  where a.id = p_battle_attempt_id and a.user_id = current_user_id
  for update;
  if attempt.id is null then raise exception 'Battle attempt not found'; end if;
  if attempt.sample_status <> 'passed'::public.test_group_status
    or attempt.hidden_status <> 'passed'::public.test_group_status
    or attempt.efficiency_status <> 'passed'::public.test_group_status then
    raise exception 'Solve the question before starting its battle';
  end if;
  if attempt.energy_spent then raise exception 'Battle energy was already spent for this attempt'; end if;

  update public.player_resources r
  set energy = r.energy - 1, updated_at = now()
  where r.user_id = current_user_id and r.energy > 0
  returning r.energy into remaining_energy;
  if remaining_energy is null then raise exception 'Not enough energy to start a battle'; end if;

  update public.battle_attempts a
  set energy_spent = true, status = 'running'::public.battle_status, updated_at = now()
  where a.id = p_battle_attempt_id;
  return remaining_energy;
end;
$$;

revoke all on function public.spend_battle_energy(uuid) from public;
grant execute on function public.spend_battle_energy(uuid) to authenticated;
