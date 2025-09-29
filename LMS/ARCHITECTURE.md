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

## Backend & Service Architecture
- **Primary API stack**: Node.js (NestJS or Fastify) running on Azure Container Apps (ACA). ACA gives us HTTPS gateways, Dapr sidecars, and scale-to-zero for non-critical revisions while still supporting burst scaling.
- **Data storage**: Azure Cosmos DB (PostgreSQL API) for course/catalog data and user progress with partition keys (`tenantId`, `courseId`). Azure Blob Storage + Front Door for media, with Azure Cognitive Search optional for retrieval.
- **Caching**: Azure Cache for Redis (standard) to cache course metadata and OWUI session tokens. Use lazy population and cache busting on publish.
- **Background jobs**: Azure Functions / Durable Functions for nightly analytics, certificate issuance, and reporting exports.
- **Plan B if OWUI disappears**: maintain a pinned fork plus a thin adapter. Critical conversational features sit behind the adapter so we can swap in LangChain/LlamaIndex services hosted in AKS/ACA without reworking LMS clients.

## OWUI Integration Strategy
- Introduce `src/lms/api/owuiClient.ts` that exposes typed methods (chat, workflow run, agent invoke, file uploads). This is the *only* place the LMS talks to OWUI.
- Version the client (`v1`, `v1-beta`) and add compatibility tests in CI: every OWUI upgrade spins up a canary container, runs smoke scenarios (course lesson, quiz auto-grade, tutor chat).
- Maintain configuration in Azure App Config (OWUI base URL, model defaults, feature flags). Secrets live in Azure Key Vault.
- Use OWUI’s event webhooks to receive grading results or workflow completion, then update LMS progress API.

## Auth, Multi-tenancy & Security
- **Identity**: Azure AD (Entra ID) with PKCE SPA app; server APIs accept JWT bearer tokens validated via Entra JWKS.
- **Roles**: `learner`, `instructor`, `admin`; optional custom roles per tenant. Roles embedded in tokens; LMS UI gates features accordingly.
- **Tenancy**: every record tagged with `tenantId`; Cosmos DB partitions, Redis namespaces, and OWUI sessions scoped. Support dedicated tenant subdomains via Front Door routing rules.
- **Security controls**: Front Door WAF, rate limiting per tenant, DDoS Standard. All secrets stored in Key Vault with managed identities.
- **Compliance**: audit log pipeline (Azure Monitor → Log Analytics). Data retention policies per tenant; Right-to-be-Forgotten implemented via Functions workflows.

## Data Model Snapshot
- **Course**: `id`, `tenantId`, `title`, `description`, `modules[]`, `draftVersion`, `publishedVersion`, `tags[]`, `owuiWorkflowRefs[]`.
- **Module**: `id`, `title`, `lessons[]`, `order`, `prerequisites[]`.
- **Lesson**: `id`, `type` (`video` | `reading` | `embed` | `quiz` | `lab`), `payload` (SCHEMA: videoUrl, markdown, embed config, quiz questions, OWUI workflow id), `estimatedDuration`.
- **Progress**: `userId`, `courseId`, `lessonId`, `status`, `score`, `lastAccessed`, `aiInteractions[]` (linking to OWUI session ids).
- **Authoring workflow**: separate collection storing draft states, review comments, diff metadata.

## Testing & Quality Gates
- **Unit/Component**: Vitest + RTL across LMS components and stores.
- **Contract tests**: Pact or Supertest suites ensuring LMS ↔ backend API compatibility; run in CI.
- **OWUI compatibility**: nightly GitHub Action pulls latest OWUI release, runs adapter smoke tests, and alerts on failures.
- **E2E**: Playwright suite covering sign-in, course browse, lesson completion, authoring flow; executed on every main merge and against staging.
- **Accessibility**: Pa11y/Cypress axe checks per release.
- **Load tests**: k6 scenarios simulating 20k concurrent learners; pipeline triggered before major releases.

## Scalability & Operations
- **Autoscaling**: ACA revisions scale based on CPU, HTTP queue, and custom metrics (requests/sec). Cosmos DB autoscale throughput; Redis sized for peak connections.
- **Observability**: Azure Monitor + App Insights with distributed tracing (OpenTelemetry). Dashboards for latency, error rate, OWUI call volume, cache hit rate.
- **Chaos & Resilience**: Azure Chaos Studio experiments (cache outage, OWUI latency injection) to validate graceful degradation (fallback lessons, cached transcripts).
- **Cost controls**: Azure Cost Management budgets per environment; alert when >70% of monthly quota. Scheduled scale-down windows for non-critical jobs; use storage lifecycle policies for logs.

## Roadmap Refinements
1. Finalize backend ADR (LMS-0001) documenting the stack above; create API-SCHEMA.md draft with OpenAPI skeleton.
2. Ship OWUI adapter library and contract tests before integrating real lessons.
3. Design multi-tenant data access layer and implement auth middleware in backend.
4. Build automated test pipelines (component, contract, E2E, compatibility).
5. Provision Azure landing zone (Front Door, ACA, Cosmos, Redis, Key Vault) with IaC (Bicep/Terraform) and cost alerts.

Track decisions and updates in `docs/DECISIONS.md` (prefix `LMS-xxxx`). Update this document whenever architecture changes.
