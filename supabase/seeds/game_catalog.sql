-- Idempotent admin seed for the Zenpho game catalog.
-- Run after migrations when you want to refresh non-user catalog data.

insert into public.milestone_catalog (
  milestone_key,
  title,
  description,
  target,
  metric,
  reward_pokemon_id,
  reward_coins,
  reward_xp,
  reward_item_key,
  is_active
)
values
  ('first_win', 'First Clear', 'Win one question encounter.', 1, 'wins', 10, 25, 40, 'poke-ball', true),
  ('easy_5', 'Route Rookie', 'Win five easy encounters.', 5, 'wins_easy', 16, 60, 90, 'great-ball', true),
  ('medium_10', 'Route Ace', 'Win ten medium encounters.', 10, 'wins_medium', 133, 140, 180, 'ultra-ball', true),
  ('hard_dp_3', 'Memo Master', 'Win three hard DP encounters.', 3, 'wins_hard_dp', 147, 220, 300, 'ultra-ball', true),
  ('caught_10', 'Collector Badge', 'Catch ten Pokemon.', 10, 'caught', 143, 180, 220, 'great-ball', true)
on conflict (milestone_key) do update set
  title = excluded.title,
  description = excluded.description,
  target = excluded.target,
  metric = excluded.metric,
  reward_pokemon_id = excluded.reward_pokemon_id,
  reward_coins = excluded.reward_coins,
  reward_xp = excluded.reward_xp,
  reward_item_key = excluded.reward_item_key,
  is_active = excluded.is_active;

insert into public.gym_catalog (
  gym_key,
  title,
  topic,
  required_wins,
  reward_pokemon_id,
  reward_coins,
  reward_xp,
  is_active
)
values
  ('array_gym', 'Array Gym', 'arrays'::public.question_topic, 3, 54, 80, 120, true),
  ('string_gym', 'String Gym', 'strings'::public.question_topic, 3, 25, 80, 120, true),
  ('graph_gym', 'Graph Gym', 'graphs'::public.question_topic, 3, 92, 120, 180, true),
  ('tree_gym', 'Tree Gym', 'trees'::public.question_topic, 3, 143, 120, 180, true),
  ('dp_gym', 'DP Gym', 'dp'::public.question_topic, 3, 147, 180, 260, true),
  ('math_gym', 'Math Gym', 'math'::public.question_topic, 3, 74, 120, 180, true)
on conflict (gym_key) do update set
  title = excluded.title,
  topic = excluded.topic,
  required_wins = excluded.required_wins,
  reward_pokemon_id = excluded.reward_pokemon_id,
  reward_coins = excluded.reward_coins,
  reward_xp = excluded.reward_xp,
  is_active = excluded.is_active;
