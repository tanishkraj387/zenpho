-- Read-only trainer leaderboard.
-- Returns limited public ranking fields without exposing private auth data.

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  username text,
  xp integer,
  coins integer,
  caught_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profiles.id as user_id,
    profiles.username,
    player_resources.xp,
    player_resources.coins,
    count(player_creatures.id) as caught_count
  from public.profiles
  join public.player_resources
    on player_resources.user_id = profiles.id
  left join public.player_creatures
    on player_creatures.user_id = profiles.id
  group by profiles.id, profiles.username, player_resources.xp, player_resources.coins
  order by player_resources.xp desc, count(player_creatures.id) desc, player_resources.coins desc, profiles.username asc
  limit 50;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;
