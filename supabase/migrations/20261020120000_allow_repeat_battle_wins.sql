-- The result function already guards first-win rewards under a per-player/question lock.
-- Keep every rematch result without paying twice.
drop index if exists public.battle_attempts_one_win_per_user_question_idx;
