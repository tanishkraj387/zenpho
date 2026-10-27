-- Award solve rewards on the server the first time a battle attempt becomes won.
-- The frontend may preview rewards, but this function is the authoritative source.

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

  select battle_attempts.question_id, battle_attempts.status
  into target_question_id, previous_status
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

  if p_status = 'won'::public.battle_status and previous_status <> 'won'::public.battle_status then
    insert into public.player_resources (user_id, coins, xp, energy, max_energy)
    values (current_user_id, reward_coins, reward_xp, reward_energy, 50)
    on conflict (user_id) do update
    set
      coins = public.player_resources.coins + excluded.coins,
      xp = public.player_resources.xp + excluded.xp,
      energy = least(public.player_resources.max_energy, public.player_resources.energy + excluded.energy),
      updated_at = now();

    -- Until a party table exists, starter creatures receive party battle XP.
    update public.player_creatures
    set xp = player_creatures.xp + party_xp
    where player_creatures.user_id = current_user_id
      and player_creatures.is_starter = true;
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
