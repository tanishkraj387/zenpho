# Lesson 6: UI, gate transitions, battle visuals, and sound

**Goal:** make the saved game state understandable and enjoyable to use. Presentation must follow the battle event list, never decide its own reward.

## 1. Build small reusable pieces first

Copy `frontend/src/components/ui/` from the [source snapshot](copyable/frontend/src/components/ui/). `PixelButton` and `PixelCard` provide consistent controls and surfaces. `Modal` supplies a focusable overlay. `MenuList` and `DialogBox` create game-like selection and text. `HPBar`, `XPBar`, and `TypeBadge` display numeric/type information. `Sprite` displays Pokémon art. `BattleStatus` and `BattleStage` compose the arena. `AppErrorBoundary` displays an error if a React tree crashes; `RouteFallback` appears while a lazy page downloads.

Small components exist so a style or accessibility fix can be made once. For example, an HP bar receives a value and maximum and converts that ratio to visual width; it does not write HP to the database. Use real buttons, labels, focus styles, and readable result text so the game still works without audio or motion.

## 2. Make the code workspace adjustable

`Battle.tsx` uses `react-resizable-panels` so the player can resize the problem, editor, and Results areas. Monaco is the code editor, not the judge; it provides typing, highlighting, and language switching. Keep the Results panel expandable after each Run/Submit and place the actual error there. Save the code text in React state while editing and include it in `record_battle_result` when submitting so the stored draft is available later. An unsent edit is not guaranteed to survive a reload.

Check a 1366×768 laptop view, a tablet, and a narrow phone. The arena should scale inside its panel, the important code/results controls should remain visible, and no attack should move a combatant off-screen. Use CSS layout sizes rather than changing combat coordinates to fix a page resize.

## 3. Understand the loading gate as a state machine

Copy [LoadingGate.tsx](copyable/frontend/src/components/ui/LoadingGate.tsx) and [gateTransition.ts](copyable/frontend/src/components/ui/gateTransition.ts). The gate has phases `loading`, `closing`, `aligned`, `opening`, and `complete`. When a route changes, it closes over the old page, swaps the displayed location while covered, then opens onto the new page. `useGateTransition` lets a page trigger the same transition for a solve or battle handoff without navigating immediately. The title changes to messages like “Question solved!”.

The key idea is delayed action:

```ts
const transition = (action: () => void, label: string) => {
  actionRef.current = action
  setTitle(label)
  setPhase('closing')
}
```

The action runs when the gate is closed. This avoids a sudden page flash. The actual component also prevents overlapping transitions, waits for route readiness, uses timer fallbacks if a CSS animation is interrupted, and shortens motion when the user prefers reduced motion. The CSS for door movement is in the global/battle style files.

## 4. Draw battle animation in logical coordinates

Copy [pokerogueAnimation.ts](copyable/frontend/src/lib/pokerogueAnimation.ts) and [pokeroguePokemonSprites.ts](copyable/frontend/src/lib/pokeroguePokemonSprites.ts). The canvas is logically 320×180 pixels. It is scaled to fit the actual screen. Keeping all attack positions in that logical coordinate system prevents laptop/phone viewport sizes from changing where a move lands. The loader caches images and animation JSON so the same move does not repeatedly download its assets.

The animation JSON contains frames and timed events. The renderer advances one move frame every 50 ms, draws a graphic sheet or background, and plays authored cues. The battle store's event `animationId` connects a server move name to a local animation resource. The UI can show a fallback text/motion if an asset is missing; the SQL damage result stays the same.

The repo's `frontend/public/pokerogue/` folder has art, arenas, move sheets/JSON, cries, music, and sound effects. `public/` means the browser can request those files by URL, for example `/pokerogue/images/...`. The [asset attribution](copyable/frontend/public/pokerogue/ATTRIBUTION.md) and [REUSE metadata](copyable/frontend/public/pokerogue/REUSE.toml) describe different origins and licenses. The snapshot includes those notices but **does not include binary media or the large public animation-data set**. For an exact local recreation, copy the entire `frontend/public/pokerogue/` directory from the original Zenpho repository into the same path in your new project, preserving its `LICENSES/` and notices. The recorded upstream source is `pagefaultgames/pokerogue-assets` beta at commit `009cac30c39d3615c7b2c320c3984af368871031`; the local asset tree includes generated atlas JSON and selected files from that source. Directly cloning the upstream repo does not automatically recreate Zenpho's generated filenames and folder layout. If you do not have the original asset tree, use your own compatible media or implement placeholders while studying the logic.

| Browser URL used by code | File to provide under `frontend/public/` |
| --- | --- |
| `/pokerogue/pokemon/54.png` and `.json` | Front-facing sprite atlas image and frame map for species 54. |
| `/pokerogue/pokemon/back/1.png` and `.json` | Back-facing atlas and frame map for species 1. |
| `/pokerogue/images/arenas/grass_bg.png` | Battle background; the renderer also expects `grass_a.png` and `grass_b.png`. |
| `/pokerogue/battle-anims/tackle.json` | Move's frame instructions; its `graphic` names a sheet under `images/battle_anims/`. |
| `/pokerogue/audio/cry/54.m4a` | Pokémon cry; other audio paths are selected by `audio.ts`. |

`prepareBattleScene` preloads a lead Pokémon atlas, an enemy atlas, and three arena images before Fight starts. If those required files are absent, the page shows a start-battle error; missing media is therefore not always optional. Copy compatible assets before testing the full battle. Obtain assets from authorized sources or use original replacements; preserve required notices and review rights before distribution. Do not treat an open-source code repository as permission for every piece of Pokémon media.

## 5. Make sound opt-in

Copy [audio.ts](copyable/frontend/src/lib/audio.ts), [AudioToggle.tsx](copyable/frontend/src/components/ui/AudioToggle.tsx), and [AudioSceneController.tsx](copyable/frontend/src/components/ui/AudioSceneController.tsx). `audio.ts` stores mute/volume preferences, loads local manifests, plays background music, sound cues, and Pokémon cries. The toggle gives the player a clear way to enable sound. Browser autoplay rules mean audio should start after an interaction. If a cry or cue fails to load, the text and battle result must still appear.

## 6. Style without hiding the game

`index.css` establishes the pixel-inspired theme, colors, and global responsive behavior. `App.css` styles app-level elements; `battle-polish.css` handles detailed battle presentation. Tailwind classes in JSX handle local layout. Use one visual system for Hub, Practice, and Battle; do not create a special color rule that makes game meanings inconsistent. Honor `prefers-reduced-motion`, keep sufficient text contrast, and ensure keyboard focus is visible.

**Checkpoint:** routes close and open smoothly, a solved Submit shows its success transition, panels resize, both Pokémon stay visible throughout attacks, optional sound can be enabled/disabled, and missing media never changes a server-computed win or loss. Next: [testing and demo](07-test-and-demo.md).
