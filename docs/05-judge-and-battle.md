# Judge, submissions, and battles

Read [architecture](01-architecture-and-concepts.md) first. This chapter follows one question from editor to Docker to PostgreSQL and explains which values are authoritative.

## The question contract

`frontend/src/data/questions.json` contains 50 public questions. `frontend/src/lib/questions.ts` defines their TypeScript shape and connects a question to its encounter. A question includes its ID, title, difficulty, topic, prompt, examples, constraints, and Python and JavaScript starter code. Each active question has a unique Pokémon encounter, enforced by the database migration `20261020140000_unique_question_encounters.sql`.

`judge-data/question-tests.json` is a separate server-side test catalog keyed by question ID. Do not place hidden tests in `frontend/src/` or `frontend/public/`: Vite can bundle or serve those paths to players. `tools/build_question_catalog.py` builds the catalog; inspect the generated questions and cases before accepting changes. When adding a question, keep the public ID, encounter mapping, function signature, examples, and all three test groups consistent.

The editor expects the starter function signature. For example, Two Sum's Python starter is a function; a pasted function *body* without its `def` line is not a complete solution in the editor. The judge runs the submitted source file, then calls the expected function with each test's arguments. For Python, indentation is syntax, so code copied into the body of a function must be aligned inside that function.

## Run and Submit

`frontend/src/lib/judge.ts` sends `POST /judge` with `code`, `language`, `mode`, `questionId`, plus display metadata. The URL is `VITE_JUDGE_URL` when set, otherwise the current website hostname on port `8787`. The response includes group states, diagnostics, playback events, a solved flag, and a reward *preview*. A preview in the browser is never an authoritative account balance.

| Mode | Groups executed | Meaning |
| --- | --- | --- |
| `run` | Samples | Quick feedback while editing; it does not solve the question. |
| `submit` | Samples, hidden, large-input/efficiency in order | A solve requires all groups to pass. The first failed group stops the sequence. |

Each group can be `pending`, `passed`, or `failed`. Sample failures can expose expected/actual values and runtime details. Hidden failures deliberately avoid disclosing test inputs. An infrastructure failure such as Docker being unavailable is returned as an error, not as a wrong answer. The Battle page expands its Results panel and displays that error.

“Efficiency” is the large-input group completing within its time limit. The project does **not** infer or prove asymptotic Big-O complexity.

The product rule calls for a small HP cost on wrong submissions while preserving solved progress and drafts. The current `record_battle_result` definition stores failed checkpoint states and the draft but does not apply that HP cost. Treat this as an implementation gap when rebuilding or extending the game; do not describe a missing penalty as already enforced.

## How the Docker judge works

`frontend/scripts/judge-server.mjs` reads `judge-data/question-tests.json` on the server. For each group, it creates a temporary directory with the submission, a language-specific runner, and group cases. It invokes `docker run` with a read-only workspace mount, no container network, 256 MiB memory, one CPU, and `--rm`. Python uses `python:3.12-alpine`; JavaScript uses `node:22-alpine`. The process has a 30-second timeout per group. The temporary workspace is removed afterward.

This gives a repeatable execution environment and constrains ordinary submissions. It is **not** a complete hostile-code sandbox. The current HTTP judge has no user authentication or request-rate control, and the Docker daemon remains a sensitive host capability. Before offering public submissions, isolate the judge on a dedicated host, authenticate and rate-limit requests, enforce request/body limits, restrict resource use further, monitor it, and review Docker's security guidance. The frontend must never receive the hidden test file or Docker control.

Run `npm run judge:check` from `frontend/` after starting `npm run judge`. It sends a known-good Python Two Sum solution through the HTTP endpoint and Docker. This checks more than a running Node process: it verifies Docker is actually able to start a container. The container is short-lived because of `--rm`, so an empty Docker Desktop container list between submissions is normal.

## The solve-to-fight sequence

```mermaid
sequenceDiagram
  participant Player
  participant UI as Battle page
  participant Judge as Local judge
  participant DB as Supabase/PostgreSQL
  Player->>UI: Submit code
  UI->>Judge: POST /judge
  Judge-->>UI: checkpoint results and diagnostics
  UI->>DB: record_battle_result(checkpoint states, draft)
  DB-->>UI: saved attempt; first-solve energy
  UI-->>Player: success overlay: Fight or return to Hub
  Player->>UI: Fight
  UI->>DB: spend_battle_energy(attempt)
  DB-->>UI: remaining energy
  loop Each command
    Player->>UI: Move, switch, or item
    UI->>DB: take_battle_action(...)
    DB-->>UI: HP, active creature, outcome, event list
    UI-->>Player: play animation and sound for events
  end
```

`Battle.tsx` stores the draft and runs the judge. On a passing Submit, it records the checkpoint states and opens the fight prompt. The player can return to Hub or spend one energy to enter combat. A first successful solve adds one energy. Repeating a solved question can open a rematch but does not grant the first-solve reward again.

`spend_battle_energy` verifies the attempt and available energy in PostgreSQL. Moves, switches, and items do not cost battle energy. `take_battle_action` checks the current turn and party state, computes the move or item effect, updates persistent HP and the attempt, and returns ordered events for the UI. A fainted creature can be switched out; defeat occurs when the available party collapses. A party has at most six selected creatures. The shop's Revive item can restore a fainted owned creature under database rules.

Combat win rewards and catch eligibility are decided by SQL functions and stored rows. A repeat encounter can allow a catch if that species is still unowned; owning it already prevents another catch. Replaying a solved problem does not farm coins or XP. Read the current definitions in `supabase/migrations/20261020160000_persistent_party_battles.sql` and the later `20261020161000_fix_battle_type_lookup.sql` when changing these rules.

## Critical trust boundary

The database calculates combat and account mutations, but the current browser sends checkpoint pass/fail states to `record_battle_result`. The judge response is not cryptographically bound to the authenticated user or attempt. A modified client can therefore misreport a solve. This is the main gap before a public, adversarial deployment. A production design should make the judge issue a server-verifiable result tied to user, attempt, question, code hash, and expiry, or have a trusted backend call the database after judging. Then the database must ignore browser-supplied pass/fail and reward values. See [security and current limitations](07-verification-deployment-and-troubleshooting.md#security-and-current-limitations).

## How to extend the judge safely

1. Define the starter function and argument/result contract in the public question.
2. Add sample, hidden, and large-input cases under the same ID in the private catalog.
3. Keep test case serialization compatible with both language runners.
4. Verify one known-correct and one intentionally wrong solution. Ensure diagnostics point to the correct group.
5. Verify syntax/runtime errors appear in Results and infrastructure failures never count as wrong answers.
6. Add the encounter mapping by migration and check that its species remains unique.

For the exact startup commands and a second-device setup, use [local setup](02-local-setup.md).
