-- Prevent repeat solved-question wins from being recorded for the same user.
-- This keeps solved questions from becoming a reward/energy farming path once
-- server-side rewards are attached to battle completion.

create unique index if not exists battle_attempts_one_win_per_user_question_idx
on public.battle_attempts (user_id, question_id)
where status = 'won'::public.battle_status;

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
  updated_attempt public.battle_attempts;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_language not in ('python', 'javascript') then
    raise exception 'Unsupported language';
  end if;

  select question_id
  into target_question_id
  from public.battle_attempts
  where battle_attempts.id = p_battle_attempt_id
    and battle_attempts.user_id = current_user_id;

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

  update public.battle_attempts
  set
    language = p_language,
    code_draft = coalesce(p_code_draft, ''),
    sample_status = p_sample_status,
    hidden_status = p_hidden_status,
    efficiency_status = p_efficiency_status,
    status = p_status,
    player_hp = greatest(0, p_player_hp),
    enemy_hp = greatest(0, p_enemy_hp)
  where battle_attempts.id = p_battle_attempt_id
    and battle_attempts.user_id = current_user_id
  returning * into updated_attempt;

  if updated_attempt.id is null then
    raise exception 'Battle attempt not found';
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
