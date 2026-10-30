# Lesson 1: make the workspace and first page

**Goal:** a browser displays a React page and you understand where every later feature will live. The [exact finished text files](copyable/README.md) can be copied as each lesson reaches them.

## 1. Create a new folder

In PowerShell, choose a place you can write, such as your Projects directory:

```powershell
cd D:\Projects
New-Item -ItemType Directory -Name zenpho-learning
cd zenpho-learning
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

If Vite asks permission to install its project creator, accept. `frontend/` is now the website. The outer folder will later contain `supabase/`, `judge-data/`, `tools/`, and `docs/`. The `npm install` command creates `node_modules/` (downloaded packages) and a `package-lock.json` (exact package versions). Never edit `node_modules/` by hand; never commit `.env.local` secrets.

## 2. Install the features this app needs

```powershell
npm install react-router-dom zustand @tanstack/react-query @supabase/supabase-js @monaco-editor/react framer-motion react-resizable-panels @fontsource/pixelify-sans @fontsource/press-start-2p
npm install -D @tailwindcss/vite tailwindcss oxlint postgres
```

`dependencies` are used by the running website; `devDependencies` are build/checking tools. The exact currently working versions and scripts are in [copyable/frontend/package.json](copyable/frontend/package.json) and [the lockfile](copyable/frontend/package-lock.json). To match this repository exactly, copy those two files over the generated ones and run `npm ci` rather than `npm install`. `npm ci` installs the lockfile's exact versions and is repeatable. Do not copy a lockfile without its matching package file.

## 3. Understand the first three files

`frontend/index.html` is the small HTML shell. The `<div id="root"></div>` is where React places the entire app. Its `<script ... src="/src/main.tsx">` starts the JavaScript. `frontend/src/main.tsx` finds that root element, imports the fonts and CSS, and renders `<App />`. `frontend/src/App.tsx` creates shared providers and maps URLs to pages.

A deliberately tiny first `src/App.tsx` can be:

```tsx
export default function App() {
  return <main><h1>Zenpho is starting</h1></main>
}
```

Run `npm run dev` and open the URL Vite prints. Seeing this heading proves your editor, Node, Vite, and browser can talk. Stop the server with Ctrl+C before changing package installation or critical configuration.

## 4. Add Tailwind and TypeScript configuration

Copy [vite.config.ts](copyable/frontend/vite.config.ts), [tsconfig.json](copyable/frontend/tsconfig.json), [tsconfig.app.json](copyable/frontend/tsconfig.app.json), and [tsconfig.node.json](copyable/frontend/tsconfig.node.json) to the matching locations. `vite.config.ts` enables the React and Tailwind plugins and splits large production bundles. `tsconfig.app.json` tells TypeScript to check `src/` using browser and JSX types. `tsconfig.node.json` checks the Vite config. `tsconfig.json` ties those configurations together.

Copy [index.css](copyable/frontend/src/index.css) and [App.css](copyable/frontend/src/App.css) when you are ready for the game's visual theme. `index.css` sets global fonts, colors, and layout rules. `App.css` contains app-level presentation styles. `battle-polish.css` is additional battle-specific styling, introduced in [lesson 6](06-visuals-and-assets.md). CSS changes appearance; it does not decide gameplay.

## 5. Grow the tree intentionally

```text
zenpho-learning/
  frontend/
    index.html                 HTML entry
    package.json               commands and dependencies
    .env.local                 your own local public configuration; do not commit
    src/
      main.tsx                 starts React
      App.tsx                  shared providers and routes
      pages/                   whole screens: Login, Hub, Battle, and so on
      components/              reusable visual pieces
      hooks/                   reusable data-fetching functions
      lib/                     adapters for Supabase, judge, questions, audio
      store/                   shared UI/session state
      data/                    public JSON catalogs
    scripts/                   Node utilities and judge server; not browser code
    public/                    downloadable browser media
  judge-data/                  private judge tests; outside public frontend
  supabase/migrations/         ordered SQL database changes
  supabase/tests/              database behavior checks
  tools/                       question-catalog generator
```

Folders are boundaries: browser files in `src/` can be delivered to users; Node scripts and `judge-data/` must stay on the server. `public/` files are directly downloadable, which is why hidden cases and credentials never belong there.

## 6. Add the finished React entry and route tree

Copy [main.tsx](copyable/frontend/src/main.tsx) and [App.tsx](copyable/frontend/src/App.tsx). `main.tsx` uses React `StrictMode`, which helps reveal accidental side effects during development. In `App.tsx`, `QueryClientProvider` supplies server-data caching; `AuthBootstrap` restores the login session; `BrowserRouter` enables page URLs; `AudioSceneController` tracks music; `LoadingGate` animates route changes; `AppRoutes` maps URLs. `lazy(...)` postpones downloading a large page until visited, and `Suspense` shows a fallback while it loads. `ProtectedRoute` sends a signed-out user to login.

The finished `App.tsx` imports files you have not copied yet, so it will show import errors until lessons 3 and 6 add them. That is expected when building in stages. You can keep the tiny App until then or copy the required page/component files from the snapshot together.

**Checkpoint:** `npm run dev` shows your tiny page; after the matching imports exist, `npm run build` reports no TypeScript errors. Next: [questions and the database](02-data-and-database.md).
