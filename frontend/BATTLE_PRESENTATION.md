# Battle presentation

> **Historical implementation note:** The final section's client-side `resolveMove` limitation is outdated. Current combat turns use PostgreSQL `take_battle_action`; the browser-supplied checkpoint status limitation remains. See the [current battle guide](../docs/05-judge-and-battle.md).

`LoadingGate` closes the gates before changing routes and opens them once the next
screen is ready. `useGateTransition` applies the same transition inside the battle
without unmounting the editor. Solved submissions display a success state before
the arena is revealed.

Battle move effects now load the source PokéRogue animation JSON and sprite sheets
for all 28 moves currently offered by the game. The player uses the source frame
sequence at 50 ms per frame and plays each move cue on its authored frame. Pokémon
cries use the source audio for IDs 1–151. Switching plays the source recall and
send-out sounds with a compact recall/reveal transition. These presentation events
do not affect damage, HP, rewards, or server-authoritative outcomes.

Source resources are under `public/pokerogue/`; their attributions and upstream
license identifiers are recorded in `public/pokerogue/REUSE.toml` and
`public/pokerogue/ATTRIBUTION.md`. PokéRogue's assets use multiple licenses,
including its AGPL animation data, fair-use Nintendo audio, and Pokémon Reborn
move cues. These distinct notices are retained; this app is not affiliated with
Nintendo, Game Freak, Creatures, PokéRogue, or Pokémon Reborn.

The arena uses PokéRogue's grass backdrop and both grass platforms while the
interface retains Zenpho's ink, cream, and sky palette. Imported animation sprite
positions are clamped to the arena so authored zooms stay visible. Solving a
question grants one energy; entering its battle spends one. Moves and switches
cost no energy.

Solved questions can be submitted again. Duplicate solves grant no energy or
other solve reward, but a new battle can be entered with one energy. The database
functions charge once per attempt and serialize first-win rewards. The results
panel has a draggable separator and shows judge errors and sample expected/received
values. The `20261020120000` migration removes the older one-win unique index,
which otherwise blocked recording rematch wins.

The catalog contains 50 questions. Public statements and examples are in
`src/data/questions.json`; private checkpoints are in `../judge-data/question-tests.json`
for the local judge. `../tools/build_question_catalog.py` regenerates both. Apply
the `20261019` catalog migrations and `20261020130000` energy migration before
using the catalog and energy flow against a Supabase project.

Removed UI demo and sprite-test routes, prototype labels, the fake shield control,
seeded Pokédex entries, invented collection statistics, static XP bars, and fixed
battle level labels. Player level labels use the loaded party data.

## Verification

Run `npm run build` and `npm run lint` in `frontend/`. Browser checks should cover
startup, route selection, a solved submission, returning between code and combat,
move playback, switching, reduced motion, and desktop/mobile widths.

## Existing battle-resolution limitation

`Battle.tsx` still calls `resolveMove` and constructs outcome events on the client.
The database RPC also accepts client-supplied checkpoint statuses. Moving all
resolution and reward decisions to trusted server code remains separate work.
