# Lesson 0: words, tools, and a mental model

You do not need to know programming to read this. Go slowly. After each small step, try it on your own computer. If a command fails, read the error before continuing: later steps depend on earlier ones.

## What you are making

Zenpho is a website where a player signs in, chooses a starter Pokémon, picks a coding question, writes a Python or JavaScript answer, and submits it. A **judge** checks the answer. A correct first solve gives one **energy**. The player may spend one energy to enter the battle tied to that question. The database computes turns, HP, catches, and rewards. The browser shows the resulting animation and sound.

Think of it as four workers:

```text
Your browser          shows pages, editor, buttons, and animations
Judge server          receives code and runs tests
Docker container      temporarily runs one submission in isolation
Supabase/PostgreSQL   stores accounts and decides game state
```

A request from one worker to another is an **API call**. The browser can ask to use a move. The database must decide its result. The browser can ask to Submit code. The judge runs the private tests. The current handoff between judge and database has a security gap explained later.

## A folder is a path, not a command

The project root is the outer `zenpho` folder. `frontend/src/App.tsx` means: open `frontend`, then `src`, then the file `App.tsx`. Do **not** type a folder path alone in PowerShell and expect it to start the program. Use `cd frontend` to change to that folder. A dot (`.`) means the current folder; two dots (`..`) mean its parent.

In the commands below, text after `#` is a comment for you, not part of the command. PowerShell can show your current folder with `Get-Location` and its files with `Get-ChildItem`. A terminal window running a server must stay open while you use that server. You will need separate terminals for Vite and the judge.

## Tools you install once

| Tool | In simple words | How to check |
| --- | --- | --- |
| **VS Code or another text editor** | Opens and saves source files. | Open the project folder. |
| **Git** | Records versions and obtains the source repository. | `git --version` |
| **Node.js + npm** | Runs the JavaScript tools; npm installs packages. | `node --version`, `npm --version` |
| **Docker Desktop** | Starts short-lived Linux containers for answers; local Supabase also uses it. | `docker info` |
| **Supabase project or local CLI** | Provides accounts and PostgreSQL. | Follow [lesson 2](02-data-and-database.md). |

Use a Node version supported by the Vite version in `frontend/package.json`; Node 24 is known to work with this repository. Install Docker Desktop in Linux-container mode and wait for its engine to start before running the judge. `docker info` must succeed.

## Tiny code dictionary

```ts
const answer = 42
```

`const` gives a name to a value. Here `answer` is a number. TypeScript is JavaScript with extra type checks. A file ending `.ts` contains TypeScript; `.tsx` also allows UI markup called JSX. The browser ultimately receives JavaScript produced by Vite's build.

```tsx
function Greeting() {
  return <h1>Hello, trainer</h1>
}
```

This is a **React component**: a function that describes what should appear on screen. `<h1>` is an HTML heading. React updates the screen when component state or props change. A **hook** such as `useState` remembers a value between renders; a **query hook** fetches server data and caches it.

```sql
select coins from public.player_resources where user_id = auth.uid();
```

SQL talks to PostgreSQL. A **table** is like a spreadsheet with rows; a **column** is one named piece of each row. `auth.uid()` identifies the signed-in caller inside Supabase. A **migration** is a numbered SQL file that changes the database structure or rules. Apply migrations in filename order.

```json
{ "questionId": "easy-arrays-two-sum", "mode": "run" }
```

JSON is a text format for structured data. The browser sends it to the judge in an HTTP request. A **response** is the judge's answer. HTTP status 200 usually means the request was handled; an error body can explain why a request failed.

## Why secrets and test cases have different homes

Anything in a `VITE_` environment variable is available to browser JavaScript. Put only the public Supabase project URL and public/anon key there. A database password or service-role key would let the wrong person bypass game rules and must stay out of frontend files. Hidden test cases live in `judge-data/`, which the Node judge reads; putting them in `frontend/public/` would let players download them.

The browser is controlled by the player. Therefore it must never be the final authority for coins, XP, catches, persistent HP, or whether a solved question should be rewarded. The database uses login identity, row-level security (**RLS**), constraints, locks, and SQL functions to enforce those rules. The current judge-to-database proof is incomplete; see [lesson 5](05-battle.md).

## The smallest successful day-one check

Open a terminal and run `node --version`, `npm --version`, and `docker info`. Then create a folder you can edit and open it in your editor. Your goal is to understand which window is editing files, which terminal is running Vite, which is running the judge, and which service stores the data. If those four roles are clear, move to [lesson 1](01-workspace.md).
