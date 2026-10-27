# Build Zenpho from scratch: beginner course and code companion

This folder is for someone who has never built a web app. Start with [0. Words, tools, and mental model](00-start-here.md), then follow the lessons in order. Each lesson says **what to create, what to paste, why it exists, and how to check it**. The [copyable source snapshot](copyable/README.md) contains the exact text of the working repository's application/configuration files, arranged in their original paths. You can copy a file from there into the matching path in a new project. The lessons explain the important blocks before asking you to do that.

| Lesson | What you build |
| --- | --- |
| [0. Start here](00-start-here.md) | Learn folders, terminals, web requests, TypeScript, React, SQL, Docker, and the trust boundary. |
| [1. Workspace and first page](01-workspace.md) | Make the project tree, install tools, run Vite, understand `main.tsx` and routes. |
| [2. Data and database](02-data-and-database.md) | Define questions, tables, ownership policies, migrations, and transactions. |
| [3. Login and navigation](03-auth-and-pages.md) | Wire Supabase, create accounts, protect routes, and understand each page. |
| [4. Code judge](04-judge.md) | Run Python/JavaScript submissions against private tests in temporary Docker containers. |
| [5. Battle and rewards](05-battle.md) | Persist HP, spend entry energy, resolve turns on the server, catch, and prevent duplicate rewards. |
| [6. Visuals and sound](06-visuals-and-assets.md) | Build reusable UI, resizable panels, gate transitions, sprites, frame animation, and audio. |
| [7. Tests and demo](07-test-and-demo.md) | Verify every service, troubleshoot a second device, and understand current limits. |
| [8. Follow one player](08-follow-one-player.md) | Trace clicks through React, the judge, SQL, and event playback. |
| [9. Core code blocks](09-core-code-blocks.md) | Guided reading of the largest React, Node, SQL, animation, and audio files. |
| [File atlas](file-atlas.md) | Plain-English explanation of every text source file and migration. |

## Two ways to follow the course

**Learn by building:** Do the lessons in order. Type the short examples yourself; then paste the complete matching files from `copyable/` when the lesson reaches that feature. Run the checkpoint before moving on. This gives you a working copy with the same logic as this repository.

**Understand an existing copy:** Open the [file atlas](file-atlas.md), find the file you are curious about, read its role and major blocks, then read the full source in `copyable/` alongside the relevant lesson.

## Optional: assemble an exact text-source copy quickly

The lessons teach you to create files one stage at a time. If you already have this repository and want a separate complete practice copy first, start with an **empty** destination folder. From the **original Zenpho repository root** in PowerShell, run the following, replacing the destination with your own writable folder:

```powershell
$practiceRoot = 'D:\Projects\zenpho-learning'
New-Item -ItemType Directory -Path $practiceRoot
Copy-Item -Path .\docs\from-scratch\copyable\frontend -Destination $practiceRoot -Recurse
Copy-Item -Path .\docs\from-scratch\copyable\supabase -Destination $practiceRoot -Recurse
Copy-Item -Path .\docs\from-scratch\copyable\judge-data -Destination $practiceRoot -Recurse
Copy-Item -Path .\docs\from-scratch\copyable\tools -Destination $practiceRoot -Recurse
Copy-Item -Path .\docs\from-scratch\copyable\package.json -Destination $practiceRoot
Copy-Item -Path .\docs\from-scratch\copyable\package-lock.json -Destination $practiceRoot
```

That assembles the text logic only. It does not create `node_modules`, `.env.local`, or binary media. Follow [lesson 2](02-data-and-database.md) for your own Supabase values and migrations, [lesson 4](04-judge.md) for Docker images, and [lesson 6](06-visuals-and-assets.md) for required battle assets. In `frontend/`, run `npm ci` after copying the package files. Do not run these copy commands over a project with work you want to keep.

## What “copyable” means

`copyable/` is a documentation snapshot of **text** files from this repository, not a second app to run in place. It includes frontend source, package/config files, catalog JSON, private judge tests, Node scripts, SQL migrations, and database tests. The paths under `copyable/` are the paths to recreate under your new project root. Run `python docs/from-scratch/sync-copyable.py --check` to detect drift from the live source; run without `--check` to refresh the snapshot after intentional code changes.

Binary media such as sprites, cries, music, fonts, and animation image sheets cannot be sensibly typed from a guide. The course explains where they belong, how the renderer loads them, and how to obtain or replace them while respecting the [asset notices](../../frontend/public/pokerogue/ATTRIBUTION.md). A code-only recreation can use placeholder images and silence until the media is added. Do not copy unlicensed media into a public release.

## A warning before hosting publicly

This is a faithful explanation of the current college-project code. Its combat calculations live in PostgreSQL, but the browser still passes judge checkpoint states to `record_battle_result`. The judge endpoint is not authenticated. These facts make the current system unsuitable as a public, adversarial code execution service without the hardening in [lesson 7](07-test-and-demo.md). The course does not present that gap as a secure pattern.
