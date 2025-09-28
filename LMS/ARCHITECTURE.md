# ODSUi LMS Extension Architecture

_Last updated: 2025-09-26_

This document outlines the architecture for Phase 3 (LMS) so the feature can be developed in parallel without disturbing the existing ODSUi shell. All LMS-specific code and assets live under the `LMS/` namespace with clearly defined integration points.

## Goals
- Deliver a modular Learning Management experience that plugs into ODSUi but can evolve independently.
- Maintain the “gold standard”: rigorous lint/build, isolated state slices, testability, accessibility.
- Centralize LMS configuration inside Settings → `LMS` tab alongside existing tabs (Apps, Branding, SSO).

## High-level Overview
```
Root (Vite/React app)
├── src/
│   ├── lms/                    # UI + state dedicated to the LMS
│   │   ├── components/         # Presentational LMS widgets (CourseCard, LessonTimeline, etc.)
│   │   ├── pages/              # LMS routes mounted under /lms/…
│   │   ├── store/              # Zustand slices (courses, progress, content editor)
│   │   ├── api/                # API clients / hooks (GraphQL/REST wrappers)
│   │   ├── hooks/              # Reusable LMS-specific hooks
│   │   └── utils/              # Formatting, access checks, helpers
│   ├── pages/LMSDashboard.tsx  # Bridge component mounted by router → defers to src/lms/pages
│   └── store/lmsStore.ts       # Re-export of LMS Zustand slices for integration
├── LMS/                        # Non-runtime assets / docs (this folder)
│   ├── ARCHITECTURE.md         # < you are here >
│   └── API-SCHEMA.md           # Contract, mock schema, etc. (future)
└── .github/workflows/          # CI picks up LMS tests (see below)
```

## Tech Stack & Libraries
- **UI**: React 18 + TypeScript (same as shell). Component primitives within the LMS use our existing Tailwind setup.
- **State**: Zustand slices namespaced under `lms`. Each slice registered via the root store but lives in `src/lms/store` to avoid polluting global state.
- **Routing**: hash router continues to drive top-level navigation. New routes like `#/lms/dashboard` or `#/lms/lesson/:id` map to components in `src/lms/pages/`.
- **Forms**: React Hook Form + Zod (lightweight, recommended for content authoring forms). Add only under `src/lms` to avoid cross-app coupling.
- **Data Layer**: API clients in `src/lms/api/` (fetch wrappers, GraphQL, etc.). Provide mock implementations for development/testing.
- **Testing**: Vitest + React Testing Library. Place tests alongside components (`Component.test.tsx`). Add LMS-specific vitest config if needed (imported by root).
- **Accessibility**: All LMS components use semantic HTML, keyboard focus traps where necessary.

## Module Breakdown
### 1. State Management (src/lms/store)
- `courseStore.ts`: courses list, metadata, filters, enrollment status.
- `lessonStore.ts`: progress, completion checkpoints, time tracking.
- `contentStore.ts`: authoring drafts saved locally (persist to local storage under `lms-content`).
- Each slice exported individually and optionally composed into `useLmsStore` re-exported from `src/store/lmsStore.ts`.
- Persistence strategy: courses/progress fetched from API, local drafts persisted via `persist` middleware with dedicated namespace (no overlap with `odsui-app`).

### 2. Pages (src/lms/pages)
- `Dashboard.tsx`: overview of enrolled courses, recent activity.
- `CourseDetail.tsx`: syllabus, modules, progress bar.
- `LessonPlayer.tsx`: content viewer (video/text/quiz). Reuses shell iframe embed when the lesson is an external tool.
- `Authoring.tsx`: instructor-only course builder (drag and drop modules, attach resources).
- `Reports.tsx`: analytics for admins (engagement, completion).

Pages consume Zustand slices via dedicated hooks (e.g. `useCourseList()`) exported from `src/lms/hooks/`.

### 3. Components (src/lms/components)
- UI blocks: `CourseCard`, `LessonTimeline`, `ProgressRing`, `QuizBuilder`, `ResourceUploader`.
- Compose with `tailwindcss` classes for theming; reference brand colors via CSS variables (already updated by the shell).

### 4. API Clients (src/lms/api)
- `client.ts`: base fetch with auth header injection (uses Azure AD tokens obtained via existing SSO store).
- `courses.ts`, `lessons.ts`, `reports.ts`: typed functions returning `Promise<Course[]>` etc.
- Provide mock clients in `__mocks__` for offline dev.

## Settings Integration
- Add `Settings → LMS` tab that configures:
  - Default enrollment paths (auto-enroll on login, available catalogs).
  - Content endpoints (API base URL, CDN for assets).
  - Feature toggles (quizzes, discussions, certificates).
  - Branding overrides (banner image per course).
- Keep LMS settings isolated in `appSettings.lms` (new typed object). Store migrations convert existing data safely.

## Routing & Navigation
- New pill-menu item for LMS (controlled by LMS settings) linking to `#/lms/dashboard`.
- Inside LMS pages, use internal navigation (breadcrumbs/tabs) instead of adding extra routes to shell.
- If LMS is disabled via settings, hide the pill-menu entry to avoid broken links.

## Testing & CI
- Extend Vitest config to include `src/lms/**/*.test.tsx`.
- Add `npm run test:lms` script (if needed) triggered in CI (GitHub Action) but optional per branch.
- Keep LMS-specific mocks inside `LMS/__fixtures__` if we need JSON sample data.

## Separation & Safety
- No LMS component should modify shell-specific slices (`appStore.ts`). All cross-communication flows through stable interfaces:
  - `useAuth()` for user identity (read-only).
  - `useBranding()` for colors/branding (read-only).
  - `settings.lms` data for configuration (read/write via dedicated update function).
- Avoid absolute imports from `src/pages/...` (except permitted wrappers). Use `src/lms/...` internal modules for LMS features.
- Put LMS-specific CSS under `src/lms/styles.css` if needed to avoid leaking into global scope.

## Next Steps
1. Scaffold folder structure under `src/lms` with placeholder components/stores/tests.
2. Add `settings.lms` schema + migration in the Zustand store.
3. Implement Settings → LMS tab UI.
4. Build LMS dashboard and navigation skeleton.
5. Hook up API clients (mock first, then real).

Track future decisions in `docs/DECISIONS.md` with prefix `LMS-xxxx` as we design modules.
