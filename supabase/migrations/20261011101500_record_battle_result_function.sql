-- Authenticated battle result recording for the current fake judge phase.
-- This does not judge code; it records the UI playback result on the user's
-- latest battle attempt so the database state matches what the user saw.

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
  updated_attempt public.battle_attempts;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_language not in ('python', 'javascript') then
    raise exception 'Unsupported language';
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
