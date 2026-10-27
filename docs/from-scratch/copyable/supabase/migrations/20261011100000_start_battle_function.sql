-- Authenticated battle-start RPC.
-- Creates a server-owned battle attempt for the selected question encounter.

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
  question_exists boolean;
  pokemon_exists boolean;
  inserted_attempt public.battle_attempts;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_language not in ('python', 'javascript') then
    raise exception 'Unsupported language';
  end if;

  select exists (
    select 1
    from public.questions
    where questions.id = p_question_id
      and questions.is_active
  )
  into question_exists;

  if not question_exists then
    raise exception 'Question is not available';
  end if;

  select exists (
    select 1
    from public.pokemon_species
    where pokemon_species.pokemon_id = p_pokemon_id
  )
  into pokemon_exists;

  if not pokemon_exists then
    raise exception 'Pokemon is not available';
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

  return inserted_attempt;
end;
$$;

revoke all on function public.start_battle(text, integer, text) from public;
grant execute on function public.start_battle(text, integer, text) to authenticated;
