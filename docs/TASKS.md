# Tasks / Roadmap

## Active – LMS Phase 1
- Backend ADR (LMS-0001) applied; keep `LMS/API-SCHEMA.md` in sync as routes evolve.
- Azure AD JWT validation (JWKS) – DONE (dev bypass via `AUTH_DEV_ALLOW=1`).
- OWUI adapter client and tutor route – initial wiring DONE; add error surface + retries.
- Repository abstraction – in-memory DONE; Cosmos repo option DONE; add read/write tests.
- Integration tests for courses/progress/tutor – PARTIAL (Fastify inject tests added).
- CI workflow for LMS API – DONE (`.github/workflows/lms-api-ci.yml`).
- Frontend: add LMS API client and wire progress updates from LessonPlayer (pending backend URL config in settings).

## Next – Phase 1.5
- Implement Cosmos schema migrations and index policies; stamp `tenantId` on all items.
- Add Supertest suites (optional) and contract tests against OpenAPI – PARTIAL (YAML path coverage + Fastify inject added).
- Add OWUI canary compatibility workflow (runs smoke tests when `OWUI_BASE_URL` secret is set).
- Add GitHub Actions environment + secrets strategy; prepare dev deployment job to Azure Container Apps.
- Implement rate limiting (+WAF at Front Door in infra phase) and basic request logging to App Insights.

## Phase 2 – Authoring
- Authoring routes (instructor-only): draft/save/publish; review comments.
- AI-assisted authoring (OWUI workflows) with version metadata.
- File uploads (Blob SAS) and media processing pipeline.

## Phase 3 – Personalization
- Adaptive recommendations (retrieval + behavior signals).
- Tutor sidebar with context retrieval per lesson.
- Automation workflows: grading, certificates, reminders.

## Ops / Infra
- Bicep/Terraform dev templates for ACA, Cosmos, Redis, Key Vault – scaffold and commit.
- App Insights dashboards + alerts; enable tracing (OpenTelemetry) in API.
- Cost budgets/alerts per environment.

## General
- Validate local dev: `npm ci && npm run dev` and `npm run build`.
- Configure external tool URLs in settings (OWUI, Penpot, Flowise, Excalidraw, ComfyUI) and update CSP accordingly.
- Review CI workflows under `.github/workflows/` and confirm Azure SWA token secret is present.
- Add light component tests if needed (none present today).
- Document architectural decisions in `docs/DECISIONS.md`; log milestones in `docs/PROJECT_HISTORY.md`.
