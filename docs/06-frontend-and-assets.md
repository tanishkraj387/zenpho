# Frontend, presentation, and assets

The application is in `frontend/`, not the root scaffold. It uses React 19 and TypeScript with Vite, React Router, Tailwind CSS, Zustand, TanStack Query, Monaco, Framer Motion, and resizable panels. The goal of this chapter is to make the boundaries clear so a feature can be rebuilt without mixing server state with animation state.

## Route and component map

Start at `frontend/src/main.tsx`, then `frontend/src/App.tsx`. The app initializes providers and routes for auth, starter selection, Hub, Practice, Battle, Collection, Shop, Profile, Gyms, and other game views. Page components live in `frontend/src/pages/`; reusable controls live in `frontend/src/components/`. `frontend/src/lib/` holds question mapping, Supabase calls, judge calls, rendering helpers, and audio logic. `frontend/src/store/` holds local UI state.

Use React Router navigation for pages. A Battle URL carries a `question` query parameter, so validate and resolve the ID through the question catalog. Do not treat a query parameter as a source of reward or encounter authority; the database validates its own attempt and species mapping.

## Which state belongs where

| State | Owner | Reason |
| --- | --- | --- |
| Login session and account identity | Supabase Auth | The browser can display a session; server policies/functions identify the caller. |
| Resources, inventory, party slots, persistent HP, attempts, catches | PostgreSQL | Must survive reloads and devices and be changed under server rules. |
| Fetched server rows and cache invalidation | TanStack Query | Refetch after RPCs rather than hand-editing account balances. |
| Editor draft and selected language | Battle page plus saved draft | Immediate user edits should not rerender the whole app; preserve unfinished work. |
| Battle event playback, open panels, modal state | React/Zustand | Ephemeral visual state; it does not decide combat results. |
| Sound preference and volumes | Audio store/local persistence | Per-device presentation preference. |

Avoid storing a second “authoritative” coin or HP value in a component. A returned RPC event can drive an animation immediately, while the account queries are invalidated and refreshed for the persisted value. Handle loading and errors for both steps. The UI should never award a catch, XP, or coins solely because an animation finished.

## Editor and submission feedback

`frontend/src/pages/Battle.tsx` composes the prompt, Monaco editor, Run/Submit controls, test checkpoints, Results area, and encounter. Resizable panels let the player give more space to the prompt, code, or output. The judge client is `frontend/src/lib/judge.ts`; it builds the endpoint from `VITE_JUDGE_URL` or the current host's port `8787`.

When an error occurs, keep the draft and show the error in Results. Distinguish a wrong answer or runtime error from a network/Docker outage. The former belongs to a checkpoint diagnostic; the latter should say the submission could not be checked. A successful `run` is only sample feedback; a successful `submit` records the solve and starts the fight-choice transition.

## Battle presentation pipeline

The SQL combat function returns an ordered event list. The UI queues those events, plays text and visuals, and eventually reveals the next command. This allows the battle scene to look animated while the database remains responsible for damage, HP, faint, switch, and outcome. Keep event type mapping explicit, and provide a readable fallback if a visual asset fails to load.

The PokéRogue-derived renderer in `frontend/src/lib/pokerogueAnimation.ts` draws into a 320×180 logical canvas and advances move frames every 50 ms. It loads Pokémon sprites, arena layers, animation JSON, image sheets, and timed effects from `frontend/public/pokerogue/`. The browser scales the canvas to the available panel; scene positions should be defined in logical coordinates so a responsive resize does not push combatants off-screen. `frontend/src/lib/pokeroguePokemonSprites.ts` handles sprite loading and drawing. Gate transitions, solve overlays, switching, and battle panels are composed by the React UI around this scene.

Framer Motion handles route and overlay motion. Respect reduced-motion preferences when extending animations and keep the important result text readable while effects play. Keep animation completion separate from the server action: a skipped or failed animation must not cause another battle turn or reward.

## Sound and asset provenance

Audio is opt-in and controlled by `frontend/src/lib/audio.ts`. Music, sound effects, and Pokémon cries use locally hosted files where available. User preferences persist per device; browser autoplay rules mean sound should begin only after an explicit interaction. If an asset cannot load, the game still needs to show the combat text/result.

Read `frontend/public/pokerogue/ATTRIBUTION.md` and `frontend/public/pokerogue/REUSE.toml` before adding, replacing, or distributing art and sound. Assets have different origins and terms; the presence of source code in an open repository does not make every sprite, cry, or music file freely licensed. The repo's PokéRogue-derived animation data and code carry their recorded attribution, and some Pokémon media is identified separately. Preserve notices and review each asset's rights before public distribution.

## Rebuilding a page

1. Define its route and what account data it reads.
2. Create typed query/RPC functions in `lib/`; handle unauthenticated, loading, empty, and error states.
3. Build the page from reusable controls and accessible labels, focus states, and keyboard actions.
4. Put visual-only state in React/Zustand and persistent state in PostgreSQL.
5. Invalidate the relevant TanStack Query keys after a successful mutation.
6. Check a narrow phone viewport and a laptop viewport. For Battle, verify panel resizing, output visibility, scene scaling, and reduced motion.

The [build-from-scratch sequence](03-build-from-scratch.md) puts these steps in project order. The [verification guide](07-verification-deployment-and-troubleshooting.md) gives a demo walkthrough.
