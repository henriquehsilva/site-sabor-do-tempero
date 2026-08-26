# AGENTS.md

## Project Overview
- React 18 + TypeScript application (Vite + Tailwind CSS)
- Firebase backend (Firestore, anonymous auth) via `src/firebase.js`
- Supabase dependency present but unused in current code
- Entry point: `src/main.tsx` → `src/App.tsx`

## Commands
- `npm run dev` - Start Vite dev server (port 5173)
- `npm run build` - Production build to `dist/`
- `npm run lint` - ESLint (TypeScript + React Hooks)
- `npm run typecheck` - TypeScript check via `tsc --noEmit -p tsconfig.app.json`
- `npm run preview` - Preview production build locally

## Environment Variables
Required in `.env` (prefix `VITE_`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Architecture Notes
- `src/firebase.js`: Firebase init + anonymous sign-in (async `initFirebase()`)
- `src/main.tsx`: React entry, mounts `<App>` to `#root`
- `src/App.tsx`: Placeholder component (currently empty)
- `src/index.css`: Tailwind directives
- `src/main.js`: Empty file (unused)

## Conventions
- ESLint ignores `dist/` directory
- Tailwind content: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
- TypeScript project references: `tsconfig.app.json` (app code), `tsconfig.node.json` (Vite config)

## Gotchas
- Firebase config uses `import.meta.env` (Vite env vars, not `process.env`)
- `lucide-react` excluded from Vite's optimizeDeps (might cause issues if imported)
- Anonymous auth enabled by default in Firebase init
