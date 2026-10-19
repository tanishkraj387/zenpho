# Pokémon Asset Pipeline

The app's roster and encounter pools are checked-in JSON in `src/data/`. Sprite
atlases for the supported roster are stored locally in `public/pokerogue/pokemon/`
and loaded through `src/lib/pokeroguePokemonSprites.ts`. The renderer reads the
PokéRogue atlas metadata and animates the idle frames on a canvas, so the same
sprites appear in battles, the collection, practice, the hub, and starter choice.

Pokémon cries and move effects also use the local assets under
`public/pokerogue/`; attribution and upstream license notices are in
`public/pokerogue/ATTRIBUTION.md` and `public/pokerogue/REUSE.toml`.

`src/lib/sprites.ts` is the shared URL helper. The remaining files in
`public/sprites/` are item icons only. Use `npm run sprites -- <path-to-item-sprites>`
to refresh those item icons; Pokémon art is sourced from PokéRogue and is not
copied from the older PokéAPI sprite set.

The roster ID list remains in `sprite-ids.json` for the cry downloader. Roster
metadata and encounter rewards continue to come from the app data and server;
asset loading does not decide game outcomes.
