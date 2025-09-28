# Agent Guide for ODSUiAppCodex

This file gives agents working in this repo the context and conventions needed to be effective across sessions. Follow these rules for any changes within this repository.

## Project Overview
- Purpose: Single‑page React app (Vite + TS) that presents a shell UI to launch/embed external tools (OWUI, Penpot, Flowise, Excalidraw, ComfyUI) and manage simple local state for projects/courses.
- Hosting: Azure Static Web Apps via GitHub Actions.
- Live site: https://studio.opendesignschool.ai

## Tech Stack
- React 18 + TypeScript + Vite
- TailwindCSS (see `src/index.css`, `tailwind.config.js`)
- Zustand for app state (`src/store`)
- Hash‑based routing implemented in `src/App.tsx` (no react‑router)

## Repo Layout (high‑level)
- `src/`
  - `main.tsx` — app bootstrap
  - `App.tsx` — routing + overall layout
  - `components/` — UI widgets (header, modals, toasts, etc.)
  - `pages/` — top‑level views (Dashboard, OWUI, Penpot, etc.)
  - `store/` — Zustand stores (`appStore.ts`, `toastStore.ts`)
  - `utils/` — small helpers (e.g., `health.ts`)
- `staticwebapp.config.json` — CSP and SWA config
- `.github/workflows/` — CI + Azure SWA deploy

## How to Run
- Install: `npm ci` (CI‑friendly; uses `package-lock.json`)
- Dev server: `npm run dev` (Vite)
- Lint: `npm run lint`
- Build: `npm run build`
- Preview build: `npm run preview`

## Conventions & Guidelines
- Keep dependencies minimal. Prefer built‑ins or existing libs already in use.
- Types first: prefer TypeScript types/interfaces over `any`.
- State: use `zustand` stores in `src/store`. Do not introduce global singletons elsewhere.
- Routing: stick to the hash‑based router in `App.tsx` unless a clear requirement to add react‑router is agreed.
- Styling: Tailwind utility classes. Keep custom CSS in `src/index.css` minimal.
- Formatting/Lint: respect `.eslintrc.cjs` and `.prettierrc`. Do not add new formatters.
- Security/CSP: if embedding new tools, update `staticwebapp.config.json` `Content-Security-Policy` for `connect-src` and `frame-src`. Avoid weakening other directives.
- Secrets: never commit secrets. Azure token is set via GitHub Actions secrets (`AZURE_STATIC_WEB_APPS_API_TOKEN`).
- Authentication: Azure AD (Entra ID) SSO configuration is stored in Settings → Single Sign-On. Keep client secrets out of the repo; use SPA app registrations with PKCE.
- Apps: Settings → Apps now manages only link-based entries (label, URL, icon, visibility). The shell always embeds the URL inside an iframe with the pill menu visible.

## Deployment
- CI uses GitHub Actions to build (`npm ci && npm run build`) and deploy `dist/` to Azure SWA. See README and workflows under `.github/workflows`.

## Persisting Context for Future Sessions
- Append significant milestones to `docs/PROJECT_HISTORY.md`.
- Record trade‑offs/decisions as short entries in `docs/DECISIONS.md`.
- Track active work in `docs/TASKS.md` (acts as a living TODO/roadmap).

## Agent Workflow Tips
1) Read this file and the README first.
2) Make small, focused changes; avoid broad refactors without an explicit request.
3) Before adding libraries or changing the stack, propose it and document rationale in `docs/DECISIONS.md`.
4) If you change CSP or cross-origin embeds, test locally and note updates in `PROJECT_HISTORY`.
5) Commits: only commit when the working tree is clean, tests/builds have passed, and the user explicitly approves the commit in the current session.
