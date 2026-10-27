-- Core game encounter rules: questions own their wild Pokemon, battle starts
-- must match that assignment, and catching requires a won battle.

alter table public.questions
add column if not exists encounter_pokemon_id integer references public.pokemon_species (pokemon_id);

create index if not exists questions_encounter_pokemon_id_idx
on public.questions (encounter_pokemon_id)
where is_active;

update public.questions
set encounter_pokemon_id = assigned.pokemon_id
from (
  values
    ('easy-arrays-two-sum', 54),
    ('easy-strings-palindrome', 25),
    ('easy-math-fizz-buzz-count', 74),
    ('medium-arrays-longest-streak', 66),
    ('medium-strings-group-anagrams', 63),
    ('medium-trees-level-sum', 133),
    ('medium-graphs-island-count', 92),
    ('hard-dp-coin-routes', 147),
    ('hard-graphs-shortest-signal', 94),
    ('hard-math-prime-window', 150)
) as assigned(question_id, pokemon_id)
where questions.id = assigned.question_id;

insert into public.questions (id, title, difficulty, topic, description, encounter_pokemon_id, examples, starter_code, is_active)
values
  ('easy-arrays-merge-tracks', 'Merge Tracks', 'easy'::public.question_difficulty, 'arrays'::public.question_topic, 'Merge two sorted score lists into one sorted list.', 1, '[{"input":"a = [1,3], b = [2,4]","output":"[1,2,3,4]"},{"input":"a = [], b = [5]","output":"[5]"}]'::jsonb, '{"python":"def solve(a, b):\n    return []\n","javascript":"export function solve(a, b) {\n  return []\n}\n"}'::jsonb, true),
  ('easy-strings-first-unique', 'First Unique Rune', 'easy'::public.question_difficulty, 'strings'::public.question_topic, 'Return the index of the first character that appears exactly once, or -1.', 39, '[{"input":"s = \"leetcode\"","output":"0"},{"input":"s = \"aabb\"","output":"-1"}]'::jsonb, '{"python":"def solve(s):\n    return -1\n","javascript":"export function solve(s) {\n  return -1\n}\n"}'::jsonb, true),
  ('easy-trees-max-depth', 'Tiny Tree Depth', 'easy'::public.question_difficulty, 'trees'::public.question_topic, 'Given a level-order tree array, return the maximum depth.', 10, '[{"input":"root = [3,9,20,null,null,15,7]","output":"3"},{"input":"root = []","output":"0"}]'::jsonb, '{"python":"def solve(root):\n    return 0\n","javascript":"export function solve(root) {\n  return 0\n}\n"}'::jsonb, true),
  ('medium-arrays-product-signal', 'Product Signal', 'medium'::public.question_difficulty, 'arrays'::public.question_topic, 'Return an array where each position is the product of all other values.', 67, '[{"input":"nums = [1,2,3,4]","output":"[24,12,8,6]"},{"input":"nums = [2,3]","output":"[3,2]"}]'::jsonb, '{"python":"def solve(nums):\n    return []\n","javascript":"export function solve(nums) {\n  return []\n}\n"}'::jsonb, true),
  ('medium-graphs-course-order', 'Course Order', 'medium'::public.question_difficulty, 'graphs'::public.question_topic, 'Return true if all courses can be finished with the given prerequisite pairs.', 93, '[{"input":"n = 2, prerequisites = [[1,0]]","output":"true"},{"input":"n = 2, prerequisites = [[1,0],[0,1]]","output":"false"}]'::jsonb, '{"python":"def solve(n, prerequisites):\n    return False\n","javascript":"export function solve(n, prerequisites) {\n  return false\n}\n"}'::jsonb, true),
  ('medium-dp-climb-routes', 'Climb Routes', 'medium'::public.question_difficulty, 'dp'::public.question_topic, 'Return how many ways there are to climb n steps using 1 or 2 steps at a time.', 64, '[{"input":"n = 3","output":"3"},{"input":"n = 5","output":"8"}]'::jsonb, '{"python":"def solve(n):\n    return 0\n","javascript":"export function solve(n) {\n  return 0\n}\n"}'::jsonb, true),
  ('medium-math-subarray-divisible', 'Divisible Signals', 'medium'::public.question_difficulty, 'math'::public.question_topic, 'Return the count of contiguous subarrays whose sum is divisible by k.', 75, '[{"input":"nums = [4,5,0,-2,-3,1], k = 5","output":"7"},{"input":"nums = [5], k = 9","output":"0"}]'::jsonb, '{"python":"def solve(nums, k):\n    return 0\n","javascript":"export function solve(nums, k) {\n  return 0\n}\n"}'::jsonb, true),
  ('hard-trees-path-sum', 'Path Sum Storm', 'hard'::public.question_difficulty, 'trees'::public.question_topic, 'Return the maximum path sum in a binary tree represented in level order.', 143, '[{"input":"root = [1,2,3]","output":"6"},{"input":"root = [-10,9,20,null,null,15,7]","output":"42"}]'::jsonb, '{"python":"def solve(root):\n    return 0\n","javascript":"export function solve(root) {\n  return 0\n}\n"}'::jsonb, true),
  ('hard-dp-edit-distance', 'Edit Distance Gate', 'hard'::public.question_difficulty, 'dp'::public.question_topic, 'Return the minimum number of edits needed to transform word1 into word2.', 149, '[{"input":"word1 = \"horse\", word2 = \"ros\"","output":"3"},{"input":"word1 = \"intention\", word2 = \"execution\"","output":"5"}]'::jsonb, '{"python":"def solve(word1, word2):\n    return 0\n","javascript":"export function solve(word1, word2) {\n  return 0\n}\n"}'::jsonb, true),
  ('hard-strings-min-window', 'Minimum Window', 'hard'::public.question_difficulty, 'strings'::public.question_topic, 'Return the shortest substring of s that contains every character from t.', 65, '[{"input":"s = \"ADOBECODEBANC\", t = \"ABC\"","output":"\"BANC\""},{"input":"s = \"a\", t = \"aa\"","output":"\"\""}]'::jsonb, '{"python":"def solve(s, t):\n    return \"\"\n","javascript":"export function solve(s, t) {\n  return \"\"\n}\n"}'::jsonb, true)
on conflict (id) do update set
  title = excluded.title,
  difficulty = excluded.difficulty,
  topic = excluded.topic,
  description = excluded.description,
  encounter_pokemon_id = excluded.encounter_pokemon_id,
  examples = excluded.examples,
  starter_code = excluded.starter_code,
  is_active = excluded.is_active;

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

  if exists (
    select 1
    from public.battle_attempts
    where battle_attempts.user_id = current_user_id
      and battle_attempts.question_id = p_question_id
      and battle_attempts.status = 'won'::public.battle_status
  ) then
    raise exception 'Question already solved';
  end if;

  insert into public.battle_attempts (
    user_id,
    question_id,
    pokemon_id,
    language
  )
  values (
    current_user_id,
    p_question_id,
    p_pokemon_id,
    p_language
  )
  returning * into inserted_attempt;

  return inserted_attempt;
end;
$$;

revoke all on function public.start_battle(text, integer, text) from public;
grant execute on function public.start_battle(text, integer, text) to authenticated;

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

  select inventory_items.category
  into item_category
  from public.inventory_items
  where inventory_items.item_key = p_ball_item_key
    and inventory_items.is_active;

  if item_category is null or item_category <> 'balls'::public.inventory_category then
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

  caught := did_catch;
  roll := catch_roll;
  threshold := catch_threshold;
  quantity := next_quantity;
  return next;
end;
$$;

revoke all on function public.catch_pokemon(text, integer, text) from public;
grant execute on function public.catch_pokemon(text, integer, text) to authenticated;
