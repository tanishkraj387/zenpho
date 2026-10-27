-- Qualify the type-chart lookup so PL/pgSQL never confuses the loop variable
-- with the table column when a move has a non-neutral effectiveness value.
create or replace function app_private.resolve_battle_move(
  p_attacker_types text[], p_defender_types text[], p_move_type text,
  p_power integer, p_accuracy integer
) returns jsonb language plpgsql set search_path = '' as $$
declare
  target_type text;
  effectiveness numeric := 1;
  factor numeric;
  critical boolean;
  damage integer;
begin
  if random() * 100 >= p_accuracy then
    return jsonb_build_object('hit', false, 'damage', 0, 'critical', false, 'effectiveness', 1);
  end if;
  foreach target_type in array p_defender_types loop
    select e.multiplier into factor from app_private.battle_type_effectiveness e
    where e.move_type = p_move_type and e.defender_type = target_type;
    effectiveness := effectiveness * coalesce(factor, 1);
  end loop;
  critical := random() < 0.06;
  damage := case when effectiveness = 0 then 0 else greatest(1, round(
    (p_power * 0.32 + 8) *
    (case when p_move_type = any(p_attacker_types) then 1.5 else 1 end) *
    effectiveness * (case when critical then 1.7 else 1 end) *
    (0.9 + random() * 0.1)
  )::integer) end;
  return jsonb_build_object('hit', true, 'damage', damage,
    'critical', critical, 'effectiveness', effectiveness);
end;
$$;
