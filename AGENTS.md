# AGENTS.md

## Project Overview
- Brazilian restaurant daily menu PWA ("Sabor do Tempero").
- **Not a React app in practice.** The real app is vanilla JS + CSS served from `public/`. React scaffolding in `src/` is dead code (never loaded by `index.html`).
- Firebase (Firestore + anonymous auth) is loaded via CDN (no bundler) for likes and order storage, with a localStorage fallback.
- Vite is used **only** as a static dev server (serves `public/` and `index.html`). There is no bundling of `public/` scripts — edits there are live with no build step.

## Commands
- `npm run dev` — Vite dev server (port 5173).
- `npm run build` / `npm run preview` — production build to `dist/` / preview.
- `npm run lint` — ESLint, **targets `*.{ts,tsx}` only** (the unused React code in `src/`).
- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json`, **targets `src/` only**.

**`lint` and `typecheck` do NOT cover the real app in `public/`.** That code has no linting or type checking.

## Key Files (real app)
- `index.html` — entire UI (nav, menu, order modal, about, mobile nav).
- `public/scripts/app.js` — all app logic: Firebase init, menu render, order flow, lightbox, WhatsApp.
- `public/scripts/firebase-init.mjs` — CDN Firebase bootstrap + anonymous auth, exposes `window.__fb`.
- `public/scripts/tts.js` — `lerTexto()` text-to-speech helper.
- `public/scripts/sw.js` — service worker (offline caching).
- `public/styles/main.css` — all styling (custom CSS, not Tailwind for the main site).
- `public/data/menu.json` — daily menu content (the main update point).
- `public/env.js` — Firebase config as `window.env` (public, non-sensitive). **Committed to repo.** Also includes `AUTHORIZED_DOMAINS` used by auth.

`src/` (App.tsx, firebase.js, main.tsx, main.js, index.css) is React/TS scaffolding that `index.html` never loads. **Do not treat it as the app unless told to migrate to it.**

## Architecture
- `public/env.js` sets `window.env`. Loaded first via `<script src="/env.js">`. Config keys are `VITE_FIREBASE_*` (e.g. `VITE_FIREBASE_API_KEY`).
- Firebase init is **duplicated**: both `firebase-init.mjs` and `app.js`'s `initFirebaseIfAvailable()` run at load; each bails if `window.__fb?.db` already exists, so only one initializes. Don't add a third.
- `app.js` on DOMContentLoaded: `initFirebaseIfAvailable()` then `carregarMenu()` (fetches `/data/menu.json`, falls back to hardcoded `SAMPLE_JSON`).
- Orders save to Firestore `orders` (or localStorage) then redirect to WhatsApp. Likes use `likes/{pratoKey}/votes/{uid}` with `onSnapshot` real-time sync.

## Menu data (`public/data/menu.json`)
- Shape: `{ meta, opcoes_do_dia, pratos[], sobre }`. Pratos: `id`, `nome`, `itens[]`, `disponivel`, optional `preco`, `imagem`, `galeria[]`.
- `meta.flags` toggles UI: `mostrar_itens_prato`, `mostrar_sessao_sobre`, `mostrar_endereco`, `mostrar_whatsapp`, `mostrar_botao_ouvir`, `usar_grade_compacta`.
- `meta.data` is `YYYY-MM-DD`; `opcoes_do_dia` caps dishes shown. `sobre` holds restaurant info + WhatsApp number.

## Gotchas
- Firebase config lives in `public/env.js` as `window.env`, NOT Vite's `import.meta.env`. The `src/firebase.js` using `import.meta.env` is dead.
- Firebase SDKs come from CDN (`gstatic.com/.../10.13.1/`), not the npm `firebase` package (unused by the real app).
- `@supabase/supabase-js` is a dependency but completely unused.
- `lucide-react` is excluded from Vite `optimizeDeps` (`vite.config.ts`) — would break if actually imported.
- Tailwind/PostCSS setup (`tailwind.config.js`, `postcss.config.js`, `src/index.css`) applies only to the dead `src/` React code, not `public/`.
- Service worker at `/scripts/sw.js` caches for offline use.
