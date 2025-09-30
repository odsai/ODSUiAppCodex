# Tasks / Roadmap

## Active – Phase 1 · Foundation
- **1.0 API & Shell Integration** (Status: Ready for smoke · Owner: Backend Guild · Target: 2025-10-10)
  - **Scope:** Finalise Fastify route contracts (`/courses`, `/progress`, `/quiz`) and keep `LMS/API-SCHEMA.md` versioned with every change; ensure frontend requests carry Azure bearer tokens with retry/backoff semantics.
  - **Deliverables:** Updated API handler tests (unit + inject), shared fetch client with auth + timeout handling, optimistic progress UI with reconciliation, Settings flow that persists `lms.apiBaseUrl` and flags misconfiguration.
  - **Exit criteria:** Lint/test green, live smoke against dev API succeeds, and updated docs in `docs/PROJECT_HISTORY.md` + `docs/DECISIONS.md` note contract deltas.
- **1.1 OWUI Tutor & Quiz Resilience** (Status: Implemented (metrics/breaker); polishing · Owner: Frontend + Backend Guild)
  - **Scope:** Drive lesson-tutor workflow through stored `owuiWorkflowRef`, add exponential retry + circuit breaker, and capture OWUI conversation artifacts (summary, transcript pointer) in `aiInteractions`.
  - **Deliverables:** Tutor panel in `LessonPlayer` with history + “Try again later” states, backend adapter with health pings, basic `/metrics`, and a canary workflow.
  - **Exit criteria:** Demo showing degraded OWUI path gracefully falling back; basic metrics observed; canary workflow green with secrets.
- **1.2 Certificates & Settings UX** (Status: In progress)
  - **Scope:** Harden eligibility checks (quiz pass threshold, module prerequisites), finalise HTML/PDF certificate generation with optional storage, and expand the Settings → LMS tab for workflow catalog browsing and feature toggles.
  - **Deliverables:** Storage-safe certificate endpoints (done), instructor-facing UX copy, and admin docs that explain the issuance + branding pipeline.
  - **Exit criteria:** Instructor acceptance walkthrough, PDF/HTML parity tests, Settings validation rules in place.
- **1.3 Data Layer Readiness** (Status: Planned)
  - **Scope:** Implement Cosmos migrations with tenant partition keys, add repository contract tests (in-memory vs Cosmos), and wire telemetry (App Insights + structured logs) for LMS + OWUI traffic.
  - **Deliverables:** Migration scripts + rollback notes, telemetry dashboards, smoke CI for OWUI adapter, and decision log entry covering data retention.
  - **Exit criteria:** Read/write parity tests pass on Cosmos emulator, telemetry dashboard reviewed with ops, and ADR updates merged.

## Next – Phase 1.5 · Ops & Reliability
- **Platform hardening:** Automated Cosmos index/policy deployment, ACA scaling rules, Redis/Key Vault templates, and GitHub Actions environment strategy with secrets rotation.
- **Traffic protection:** Rate limiting at API + Front Door, WAF rule-set for OWUI/LMS endpoints, and end-to-end tracing via OpenTelemetry.
- **Resilience drills:** Canary workflow that exercises OWUI adapter on each deploy, chaos experiments (OWUI latency injection, cache loss), and runbooks for recovery.

## Phase 2 – Authoring & Workflow Studio
- **Authoring surfaces:** Instructor-only draft/save/publish routes, review queue, and granular permissions via Azure AD roles.
- **OWUI co-creation:** Workflow templates that generate outlines, quiz banks, rubrics; inline comparison + version notes stored alongside lesson metadata.
- **Asset pipeline:** Blob SAS upload experience, media processing Functions, CDN asset mapping, and content hash versioning.
- **Collaboration:** Real-time co-edit (presence + locking), comment threads, and audit trail persisted to Cosmos with diff views.

## Phase 3 – Personalization & Intelligent Delivery
- **Adaptive sequencing:** Recommendation engine combining LMS progress, OWUI tutor signals, and engagement metrics to reorder lessons/modules.
- **Intelligent tutoring:** Embedded sidebar with contextual retrieval, streak nudges, reflective journal prompts, and sentiment tracking.
- **Automation flows:** OWUI-managed workflows for grading digests, certificate issuance, cohort reminders, and instructor nudges.

## Ops / Infra
- Bicep/Terraform dev templates for ACA, Cosmos, Redis, Key Vault – scaffold and commit.
- App Insights dashboards + alerts; enable tracing (OpenTelemetry) in API.
- Cost budgets/alerts per environment.

## Phase 4 – Analytics & Insights
- Learner + instructor dashboards (engagement funnels, quiz breakdowns, OWUI session insights) with drill-down filters.
- Narrative summaries generated via OWUI workflows plus human annotation loops.
- Data governance: export policies, Power BI/CSV connectors, anomaly alerts for dropout risk.

## Phase 5 – Ecosystem & Extensibility
- Pluggable tool registry supporting tenant-specific OWUI workflows and third-party embeds with CSP automation.
- White-label themes, translation packs, and scoped secret management for multi-tenant deployments.
- Shared content library with moderation workflows, version lineage, and cross-tenant cloning requests.

## Phase 6 – Continuous Improvement
- Testing strategy: unit/contract/E2E targets per release, OWUI regression suites, and automated accessibility audits.
- Feedback loops: in-app surveys, tutor sentiment dashboards, and backlog grooming tracked in `docs/PROJECT_HISTORY.md`.
- Quarterly cost + performance reviews with autoscaling and storage lifecycle adjustments.

## General
- Validate local dev: `npm ci && npm run dev` and `npm run build`.
- Configure external tool URLs in settings (OWUI, Penpot, Flowise, Excalidraw, ComfyUI) and update CSP accordingly.
- Review CI workflows under `.github/workflows/` and confirm Azure SWA token secret is present.
- Add light component tests if needed (none present today).
- Document architectural decisions in `docs/DECISIONS.md`; log milestones in `docs/PROJECT_HISTORY.md`.
