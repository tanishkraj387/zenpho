begin;

select plan(22);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.player_pokedex'::regclass),
  'player_pokedex has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.party_slots'::regclass),
  'party_slots has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.milestone_catalog'::regclass),
  'milestone_catalog has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.gym_catalog'::regclass),
  'gym_catalog has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.player_gym_badges'::regclass),
  'player_gym_badges has RLS enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.player_pokedex', 'select'),
  'authenticated can read own Pokedex rows through policy'
);

select ok(
  not has_table_privilege('anon', 'public.player_pokedex', 'select'),
  'anon cannot read player Pokedex rows'
);

select ok(
  has_table_privilege('authenticated', 'public.party_slots', 'select'),
  'authenticated can read own party slots through policy'
);

select ok(
  not has_table_privilege('anon', 'public.party_slots', 'select'),
  'anon cannot read party slots'
);

select ok(
  has_table_privilege('anon', 'public.milestone_catalog', 'select'),
  'anon can read public milestone catalog'
);

select ok(
  has_table_privilege('anon', 'public.gym_catalog', 'select'),
  'anon can read public gym catalog'
);

select ok(
  has_table_privilege('authenticated', 'public.player_gym_badges', 'select'),
  'authenticated can read own gym badges through policy'
);

select ok(
  not has_table_privilege('anon', 'public.player_gym_badges', 'select'),
  'anon cannot read gym badges'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_pokedex'
      and policyname = 'Users can view their own Pokedex'
  ),
  'player_pokedex ownership policy exists'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'party_slots'
      and policyname = 'Users can view their own party slots'
  ),
  'party_slots ownership policy exists'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_gym_badges'
      and policyname = 'Users can view their own gym badges'
  ),
  'player_gym_badges ownership policy exists'
);

select ok(
  has_function_privilege('authenticated', 'public.set_party_slot(integer, uuid)', 'execute'),
  'authenticated can execute set_party_slot'
);

select ok(
  not has_function_privilege('anon', 'public.set_party_slot(integer, uuid)', 'execute'),
  'anon cannot execute set_party_slot'
);

select ok(
  has_function_privilege('authenticated', 'public.claim_milestone_reward(text)', 'execute'),
  'authenticated can execute claim_milestone_reward'
);

select ok(
  not has_function_privilege('anon', 'public.claim_milestone_reward(text)', 'execute'),
  'anon cannot execute claim_milestone_reward'
);

select ok(
  has_function_privilege('authenticated', 'public.claim_gym_reward(text)', 'execute'),
  'authenticated can execute claim_gym_reward'
);

select ok(
  not has_function_privilege('anon', 'public.claim_gym_reward(text)', 'execute'),
  'anon cannot execute claim_gym_reward'
);

select * from finish();

rollback;
