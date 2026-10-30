-- Each active coding question has its own Pokémon encounter.
-- Existing battle attempts keep their historical Pokémon IDs.
update public.questions as question
set encounter_pokemon_id = assignment.pokemon_id
from (values
  ('easy-arrays-contains-duplicate', 19),
  ('easy-arrays-best-profit', 52),
  ('easy-arrays-move-zeroes', 50),
  ('medium-arrays-rotate', 28),
  ('easy-arrays-missing-number', 43),
  ('easy-arrays-intersection', 98),
  ('easy-arrays-majority', 56),
  ('easy-arrays-sorted-squares', 27),
  ('easy-arrays-binary-search', 81),
  ('easy-arrays-pivot-index', 116),
  ('easy-strings-reverse-words', 53),
  ('easy-strings-valid-anagram', 35),
  ('easy-strings-common-prefix', 37),
  ('easy-strings-roman-integer', 96),
  ('easy-strings-valid-parentheses', 48),
  ('medium-strings-longest-substring', 137),
  ('easy-strings-isomorphic', 102),
  ('medium-math-count-primes', 101),
  ('easy-math-palindrome-number', 100),
  ('easy-math-power-two', 111),
  ('medium-math-trailing-zeroes', 82),
  ('medium-dp-house-robber', 79),
  ('easy-dp-min-cost-stairs', 60),
  ('medium-dp-unique-paths', 80),
  ('medium-dp-coin-change', 138),
  ('medium-graphs-flood-fill', 73),
  ('medium-graphs-components', 117),
  ('easy-graphs-valid-path', 41),
  ('easy-trees-same-tree', 13),
  ('easy-trees-min-depth', 46)
) as assignment(question_id, pokemon_id)
where question.id = assignment.question_id;

alter table public.questions
  add constraint active_question_has_encounter
  check (not is_active or encounter_pokemon_id is not null);

create unique index questions_active_encounter_pokemon_id_key
  on public.questions (encounter_pokemon_id)
  where is_active;
