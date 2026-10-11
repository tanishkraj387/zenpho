# Zenpho QA Checklist

Run this before pushing or demoing.

## Setup

- Confirm `.env` exists locally and is not committed.
- Confirm `public/user-assets/` stays ignored by Git.
- Run `npm run build`.
- Run the dev server and test with a fresh browser session.

## Auth

- Signup creates a Supabase Auth user.
- Email confirmation routes to `/auth/callback`.
- Login redirects to `/starter` when no starter exists.
- Login redirects to `/hub` after starter selection.
- Logout from Profile returns to `/login`.

## Starter And Hub

- Choose Bulbasaur, Charmander, or Squirtle once.
- Hub shows real coins, energy, caught count, party, and milestone progress.
- Milestone claim is disabled until complete.
- Completed milestone claim refreshes resources, collection, and party.

## Practice And Battle

- Practice filters work for search, difficulty, topic, and solved status.
- Selecting a route opens `/battle?question=...`.
- Run only updates sample-test state.
- Submit success opens the Pokemon fight.
- Moves can be used repeatedly while enough energy remains.
- Wait restores energy and lets the enemy act.
- Switch Pokemon changes the active party member.
- Win records the solved question before catch is allowed.
- Failed catch and defeat return to Practice.
- Solved questions cannot be farmed for repeat rewards.

## Collection, Shop, Profile, Leaderboard, Gyms

- Collection shows seen Pokemon from battle attempts and caught Pokemon from catches.
- Collection detail modal opens for seen/caught Pokemon and plays a cry when audio is on.
- Shop purchases update coins and owned quantity.
- Profile shows recent battles, resources, milestone progress, and gym badges.
- Leaderboard shows XP, caught count, and coins without private account data.
- Gyms show topic progress and claim rewards only when unlocked.

## Audio

- Audio can be enabled from the header.
- Music volume and SFX/cry volume persist after reload.
- Hub, Practice, Battle, Gyms, Victory, and Catch scenes switch music.
- Pokemon cries play from local user assets when present.
- Generated fallback sounds play when local cues are unavailable.

## Responsive

- Check 390px mobile width for no horizontal scrolling.
- Check 768px tablet width for readable cards and filters.
- Check 1366x768 desktop for Battle with no page scroll in desktop layout.
- Header wraps cleanly without clipping Profile, Audio, Bag, or Hint.
