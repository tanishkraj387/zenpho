-- Authenticated starter selection RPC.
-- This is server-authoritative: the frontend requests a starter, and the
-- database validates ownership and inserts the creature once.

create unique index if not exists player_creatures_one_starter_per_user_idx
on public.player_creatures (user_id)
where is_starter;

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

  return inserted_creature;
end;
$$;

revoke all on function public.choose_starter(integer) from public;
grant execute on function public.choose_starter(integer) to authenticated;
