# Repository Guidelines

## Project Overview

This project is a Pokemon-style coding battle game. Players progress through coding-themed encounters and battles, with game rewards computed server-side only.

## Architecture

- Frontend code lives in `frontend/`.
- The frontend stack is Vite, React, TypeScript, Tailwind CSS, React Router, Zustand, TanStack Query, Framer Motion, and Monaco.
- The backend is Supabase.
- Game reward calculation must remain on the server side. Do not trust client-side reward computation for authoritative state.

## Working Guidelines

- Do not write application code unless explicitly asked.
- Preserve shared repository files and avoid unrelated changes.

## Battle Rules

- One coding problem per battle; the test groups (sample tests, hidden tests, efficiency tests) are the battle checkpoints.
- Efficiency means passing large-input tests within the time limit; never claim to measure Big-O.
- No timers or speed bonuses.
- Wrong submissions cost a small amount of HP; solved progress and code drafts are never lost.
- All outcomes (damage, XP, coins, catches) are decided by the server. The UI only plays back a list of battle events.
