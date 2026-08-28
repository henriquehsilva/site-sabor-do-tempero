# AGENTS.md

## Project Overview
- Brazilian restaurant daily menu PWA ("Sabor do Tempero")
- **Not a React app in practice.** The real app is vanilla JS + CSS served from `public/`. React scaffolding exists in `src/` but is unused by `index.html`.
- Firebase (Firestore + anonymous auth) loaded via CDN (no bundler) for likes and order storage, with localStorage fallback.
- Vite is used only as a static dev server (serves `public/` and `index.html`).

## Key Files
- `index.html` — the entire UI (navigation, menu, order modal, about section, mobile nav). Single-page, ~330 lines.
- `public/scripts/app.js` — all application logic (~1123 lines): Firebase init, menu rendering, order flow, lightbox, WhatsApp integration.
- `public/scripts/firebase-init.mjs` — Firebase SDK bootstrap (CDN imports, anonymous auth, exposes `window.__fb`). **Duplicates** `initFirebaseIfAvailable()` from `app.js`; both run at load but only one initializes.
- `public/scripts/tts.js` — text-to-speech helper (`lerTexto`).
- `public/scripts/sw.js` — service worker for offline caching.
- `public/styles/main.css` — all styling (custom CSS, not Tailwind for the main site).
- `public/data/menu.json` — menu data (daily content update point).
- `public/env.js` — Firebase config as `window.env` (public, non-sensitive keys). **Committed to repo.**
- `src/` — React/TypeScript scaffolding (App.tsx, firebase.js, main.tsx). NOT loaded by index.html. Safe to ignore for current app behavior.

## Commands
- `npm run dev` — Vite dev server (port 5173), serves `public/` and `index.html`
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm run lint` — ESLint (TypeScript + React Hooks, targets `src/` only)
- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json` (targets `src/` only)

**Note:** `lint` and `typecheck` only cover `src/` (the unused React code). The real app in `public/` has no linting or type checking.

## Architecture
- `public/env.js` sets `window.env` with Firebase config. Loaded before all scripts via `<script src="/env.js">`.
- `public/scripts/firebase-init.mjs` runs at page load, imports Firebase SDKs from CDN (`gstatic.com`), performs anonymous auth, exposes `window.__fb` with Firestore helpers.
- `public/scripts/app.js` runs on DOMContentLoaded: calls `initFirebaseIfAvailable()` then `carregarMenu()` (fetches `/data/menu.json`, falls back to hardcoded `SAMPLE_JSON`).
- Menu data structure: `{ meta, opcoes_do_dia, pratos[], sobre }`. Pratos have `id`, `nome`, `itens[]`, `disponivel`, optional `preco`, `imagem`, `galeria[]`.
- Orders are saved to Firestore collection `orders` (or localStorage if Firebase unavailable), then redirected to WhatsApp with formatted message.
- Likes use Firestore subcollection `likes/{pratoKey}/votes/{uid}` with real-time sync via `onSnapshot`.

## Data Flow
1. Update `public/data/menu.json` to change daily menu content
2. Menu JSON schema: `meta.titulo_dia`, `meta.data` (YYYY-MM-DD), `meta.flags` (toggle UI sections), `opcoes_do_dia` (max dishes shown), `pratos[]`, `sobre` (restaurant info + WhatsApp number)
3. `meta.flags` controls: `mostrar_itens_prato`, `mostrar_sessao_sobre`, `mostrar_endereco`, `mostrar_whatsapp`, `mostrar_botao_ouvir`, `usar_grade_compacta`

## Gotchas
- Firebase config is in `public/env.js` (committed, `window.env`), NOT via Vite's `import.meta.env`. The `src/firebase.js` file using `import.meta.env` is dead code.
- Firebase SDKs loaded from CDN (`https://www.gstatic.com/firebasejs/10.13.1/`), not from npm. The `firebase` npm package in `package.json` is unused by the real app.
- `lucide-react` excluded from Vite optimizeDeps in `vite.config.ts` — may cause issues if actually imported.
- `@supabase/supabase-js` is a dependency but completely unused.
- `src/main.js` is empty. `src/main.tsx` mounts React but `index.html` doesn't load it.
- The Tailwind setup (`tailwind.config.js`, `postcss.config.js`, `src/index.css`) applies to `src/` React code, not the main `public/` site.
- Service worker registered at `/scripts/sw.js` handles offline caching.
