# Lesson 5: energy, turns, persistent HP, catches, and rewards

**Goal:** make a battle an ordered set of requests to PostgreSQL. The browser chooses a command and plays the returned events; it does not invent damage or add coins. This lesson is the most important one for understanding game correctness.

## 1. Draw the state machine first

An **attempt** is a database row for one question and encounter. Its status can be `started`, `submitted`, `running`, `won`, `lost`, or `abandoned`. The actual flow is:

```text
Open question -> start_battle -> attempt created
Run code -> sample feedback only
Submit passing code -> record_battle_result -> solved; first solve +1 energy
Choose Hub -> leave without paying battle energy
Choose Fight -> spend_battle_energy -> -1 energy, healthy lead selected
Move / switch / item -> take_battle_action -> HP and events updated
Enemy HP reaches 0 -> server outcome won -> record final result -> catch eligible
All party members faint -> server outcome lost
```

There is one coding question per battle. Sample, hidden, and large-input tests are checkpoints of that question. There is no countdown timer or speed bonus. Large-input tests use a time limit only to decide whether that test group passes. Moves do not use energy; the single energy is an entry ticket.

## 2. Frontend adapters translate buttons into RPCs

Copy [battleAttempts.ts](copyable/frontend/src/lib/battleAttempts.ts). It defines TypeScript types for an attempt, statuses, and the response from `take_battle_action`. It has one small function for each database call. The action call is essentially:

```ts
const { data, error } = await supabase.rpc('take_battle_action', {
  p_battle_attempt_id: attemptId,
  p_action: action,
  p_move_name: moveName,
  p_creature_id: creatureId,
  p_item_key: itemKey,
})
if (error) throw error
```

The browser passes the player's **choice**, not the damage result. `if (error) throw error` lets the page show a useful failure rather than pretending a move happened. The returned `events`, `enemyHp`, `playerHp`, `activeCreatureId`, `outcome`, and `needsSwitch` describe what the database decided. `Battle.tsx` calls the adapter and queues events for presentation.

`party.ts` is the read/write adapter for the selected six creatures and healing. It joins `party_slots` to `player_creatures`, then adds public species display data. `collection.ts` reads caught/seen records and calls `catch_pokemon`; its `caught` result is from SQL, not a random roll in React. `shop.ts` and `progress.ts` use the same pattern for purchases and progress.

## 3. Spend energy atomically

The current SQL is in [20261020160000_persistent_party_battles.sql](copyable/supabase/migrations/20261020160000_persistent_party_battles.sql). `spend_battle_energy` gets `auth.uid()`, locks the attempt, requires all three checkpoints to be recorded as passed, checks this attempt has not spent energy, picks the first healthy party member, and decrements energy only when `energy > 0`. It sets `energy_spent`, `status = running`, active creature, HP, and turn number in the same transaction.

This fragment is the key double-spend guard:

```sql
update public.player_resources r
set energy = r.energy - 1, updated_at = now()
where r.user_id = current_user_id and r.energy > 0
returning r.energy into remaining_energy;
if remaining_energy is null then
  raise exception 'Not enough energy to start a battle';
end if;
```

The `where` condition and update happen together in the database. Two fast clicks cannot both read an old energy number in the browser and independently subtract it. A page should disable Fight while a request is pending for good UX, but this SQL guard is what protects the saved value.

## 4. Resolve a turn on the server

`take_battle_action` checks the signed-in user, active attempt, paid entry, active party creature, and action name. A `move` must be in the allowed move catalog. `app_private.resolve_battle_move` computes hit, critical hit, damage, and type effectiveness. The SQL subtracts enemy HP and builds JSON events such as `player_attack`, `enemy_hit`, and `enemy_hp`. If the enemy remains alive, it selects an enemy move, updates the active owned creature's `current_hp`, and builds enemy events. A `switch` checks that the replacement is owned, in the party, and healthy. An `item` checks inventory and target, calls healing logic, and consumes the item. The function saves the new attempt state and returns a JSON object.

An event is a small instruction for **presentation**, for example:

```json
{ "type": "enemy_hp", "value": 63, "text": "Psyduck has 63 HP remaining." }
```

`value` is the server's HP result. `text` is the message. The browser may animate the bar toward 63, but it may not change the stored row to a different number. `battle_events` also stores turn records for history/audit.

When the active creature reaches zero, the database checks whether another selected party member has HP. If one is healthy, the UI must ask for a switch. If none is healthy, the outcome becomes `lost`. The HP change is stored on `player_creatures`, so a reload does not heal the Pokémon. A Revive or potion is an inventory item handled by SQL; its use can be outside battle or as an eligible battle action.

## 5. Give first rewards once and allow rematches

`record_battle_result` stores submitted code and checkpoint states. On a first solve it adds one energy. On a first confirmed combat win it awards the question's coins and XP. It checks past attempts and uses locks so duplicate submissions or near-simultaneous requests cannot collect those first rewards repeatedly. A solved question can be submitted again, spend another entry energy, and fight again; the rematch has no repeat solve/win reward.

`catch_pokemon` requires a won latest matching attempt, an eligible ball, and a species the player does not already own. It decrements ball inventory, computes a threshold and roll in PostgreSQL, writes a catch attempt, and creates a creature only on success. The species ownership check happens **before** consuming another ball. If the first encounter ended without a catch, a winning rematch may offer another chance. The [catch migration](copyable/supabase/migrations/20261020150000_catch_uncaught_rematches.sql) contains the current rule.

## 6. Play the event list in the browser

Copy [battleStore.ts](copyable/frontend/src/store/battleStore.ts). Its `BattleEvent` union names every event shape. `enqueueEvents` saves a queue. `playNextEvent` takes its first event and calls `applyEvent`, which sets dialogue, animations, and displayed HP. `finishCurrentEvent` advances after the visual duration. An attack event waits for its animation to finish. These are **display values**; the SQL response and persisted rows are authoritative.

The large [Battle.tsx](copyable/frontend/src/pages/Battle.tsx) is easier to read as five groups: imports/types/helpers, editor and judge state, solve/fight transition, RPC action handlers, and rendered JSX (problem/editor/results/arena/overlays). Search for `submitToJudge`, `recordCurrentBattleResult`, `startEncounterFight`, `runBattleAction`, and `startCatch` in that order. When `runBattleAction` returns `outcome`, the page records the final result and refetches party/resources. The rendered menu uses the event queue to prevent another command while one is still playing.

## 7. Understand the current trust gap

`record_battle_result` receives `sample_status`, `hidden_status`, and `efficiency_status` from the browser. The judge's HTTP result is not bound to the signed-in user or attempt with a proof the database can verify. Therefore the database's combat math is server-side, but a modified browser can still lie about solving a question. A public release should have a trusted backend or signed judge result linked to the user, attempt, question, and code hash; the database must verify that result instead of accepting browser-supplied checkpoint states.

The intended product rule also says a wrong submission should cost a small amount of HP without losing the draft or solved progress. The current `record_battle_result` saves the failed status and draft but does **not** deduct persistent creature HP. That rule still needs implementation; the guide states the difference so you do not assume it already works.

**Checkpoint:** a first solve grants one energy, choosing Hub spends none, entering Fight spends exactly one, a move changes stored HP, a fainted active Pokémon can switch if another is healthy, a rematch gives no duplicate reward, and a catch of an already owned species is refused. Next: [visuals and sound](06-visuals-and-assets.md).
