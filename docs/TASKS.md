# Tasks / Roadmap

## Active – Phase 1 · Foundation

- **1.0 API & Shell Integration** (Status: Completed · Owner: Backend Guild · Target: 2025-10-10)
  - **Scope:** Finalise Fastify route contracts (`/courses`, `/progress`, `/quiz`) and keep `LMS/API-SCHEMA.md` versioned with every change; ensure frontend requests carry Azure bearer tokens with retry/backoff semantics.
  - **Deliverables:** Updated API handler tests (unit + inject), shared fetch client with auth + timeout handling, optimistic progress UI with reconciliation, Settings flow that persists `lms.apiBaseUrl` and flags misconfiguration.
  - **Exit criteria:** Lint/test green, live smoke against dev API succeeds, and updated docs in `docs/PROJECT_HISTORY.md` + `docs/DECISIONS.md` note contract deltas.
- **1.1 OWUI Tutor & Quiz Resilience** (Status: Completed · Owner: Frontend + Backend Guild)
  - **Scope:** Drive lesson-tutor workflow through stored `owuiWorkflowRef`, add exponential retry + circuit breaker, and capture OWUI conversation artifacts (summary, transcript pointer) in `aiInteractions`.
  - **Deliverables:** Tutor panel in `LessonPlayer` with history + “Try again later” states, backend adapter with health pings, basic `/metrics`, and a canary workflow.
  - **Exit criteria:** Demo showing degraded OWUI path gracefully falling back; basic metrics observed; canary workflow green with secrets.
- **1.2 Certificates & Settings UX** (Status: Completed)
  - **Scope:** Harden eligibility checks (quiz pass threshold, module prerequisites), finalise HTML/PDF certificate generation with optional storage, and expand the Settings → LMS tab for workflow catalog browsing and feature toggles.
  - **Deliverables:** Storage-safe certificate endpoints (done), instructor-facing UX copy, and admin docs that explain the issuance + branding pipeline.
  - **Exit criteria:** Instructor acceptance walkthrough, PDF/HTML parity tests, Settings validation rules in place.
- **1.3 Data Layer Readiness** (Status: Planned)
  - **Scope:** Implement Cosmos migrations with tenant partition keys, add repository contract tests (in-memory vs Cosmos), and wire telemetry (App Insights + structured logs) for LMS + OWUI traffic.
  - **Deliverables:** Migration scripts + rollback notes, telemetry dashboards, smoke CI for OWUI adapter, and decision log entry covering data retention.
  - **Exit criteria:** Read/write parity tests pass on Cosmos emulator, telemetry dashboard reviewed with ops, and ADR updates merged.
- **Dashboard Studio Shell** (Status: Completed · Owner: Frontend Guild · Target: 2025-10-31)
  - **Scope:** Elevate the dashboard into the flagship “learn–design–develop–deploy” cockpit with project workspaces, AI co-pilot summaries, and studio presets spanning industrial, communication, interaction, and research verticals.
  - **Deliverables:** Modular dashboard layout spec, adaptive overview panels with live AI insights, CRUD-complete project library, and integration hooks for asset management + workflow launchers.
  - **Exit criteria:** Design system prototype aligned with Apple HIG, implemented MVP panels in app, telemetry capturing dashboard interactions, and onboarding brief published in `docs/PROJECT_HISTORY.md`.

## Active – Phase 2 · Collaboration & Authoring (Target: 2025-12-15)

- **2.1 Presence & Activity Stream** (Status: In Progress · Owner: Frontend Guild)
  - **Scope:** Introduce a lightweight presence service and activity stream that surfaces real-time collaborator cursors, status dots, and recent actions across projects.
  - **Deliverables:** Presence store with BroadcastChannel/WebSocket adapter stub, activity sidebar component, event schema for join/leave/edit, mock server harness, OPS telemetry hook for BroadcastChannel fallbacks.
  - **Exit criteria:** Multiple browsers show live presence + activity updates via mock channel; Co-Pilot card references latest activity.
- **2.2 Collaboration Threads** (Status: Discovery · Owner: Frontend Guild)
  - **Scope:** Enable inline comments/crit threads on project briefs and assets, including mention support and resolution toggles.
  - **Deliverables:** Comment model + UI components, optimistic store with persistence adapter interface, notification hook for mentions, “Mark resolved” workflows.
  - **Exit criteria:** Comments persist locally with optimistic updates and can be resolved/reopened; presence avatars display on active threads.
- **2.3 Asset Versioning Foundations** (Status: Discovery · Owner: Frontend Guild)
  - **Scope:** Track asset revisions, surface quick compare views, and prepare hooks for background processing (hashing, preview regeneration).
  - **Deliverables:** Version metadata in `filesStore`, diff view for text/code, metadata compare panel for media, hashing utility stub, background processing queue interface.
  - **Exit criteria:** Uploading an asset preserves prior version with compare affordances; diff view functional for text/code assets.
- **2.4 Authoring Surfaces MVP** (Status: Discovery · Owner: Frontend Guild)
  - **Scope:** Provide draft/publish flows for project briefs and LMS lessons with autosave, AI assist, and mentor review queue.
  - **Deliverables:** Rich text/markdown editor component, draft/published states in store + API contract, autosave with conflict detection, review dashboard for mentors, REST endpoints for review submit/resolve, notifications for mentions/approvals.
  - **Exit criteria:** Authors can draft → request review → publish with review queue capturing approvals/changes; autosave handles concurrent edits.
- **2.5 API & Transport Integration** (Status: Planned · Owner: Frontend + Backend Guild)
  - **Scope:** Replace local scaffolds with production services for reviews, comments, asset versions, notifications, and presence.
  - **Deliverables:**
    - REST: `/api/reviews`, `/api/projects/:id/comments`, `/api/assets/:id/versions`, `/api/notifications`
    - WebSocket/SignalR channels for presence + notifications
    - Frontend wiring for optimistic updates + reconciliation
    - Updated `LMS/API-SCHEMA.md` + backend docs per `docs/BACKEND_INTEGRATION_PLAN.md`
  - **Exit criteria:** Dashboard reflects persisted data after reload; real-time events delivered over WS; local stubs removed.

### Milestones

1. **Backend API implementation** (owners: Backend Guild · Target 2025-11-15)
   - Implement REST/WS endpoints per integration plan
   - Update `LMS/API-SCHEMA.md`; add service tests
2. **Frontend wiring** (owners: Frontend Guild · Target 2025-11-30)
   - Replace stub clients with `apiClient` calls and WS subscriptions
   - Ensure optimistic updates reconcile with server payloads
3. **Data layer readiness** (revisit Phase 1.3)
   - Cosmos migrations/telemetry once APIs are live
4. **Authoring/LMS fusion**
   - Extend authoring panel to LMS lessons and ensure review queue covers lesson drafts

## Physical Integrations (Hardware + Edge)

- **Physical Integrations Track** (Status: Discovery · Owner: Hardware/Edge Guild · Target: 2025-11-30)
  - **Scope:** Establish the rails for lab devices and spaces: device registry, job queues, twin-first simulation, safety policy engine, and reference adapters for common fabrication tools. Prepare real-time telemetry channels and identity/role gates that unify physical and virtual studio operations.
  - **Deliverables:**
    - Type-safe device registry schema (device, capability map, safety class, location, maintenance)
    - Job model + queue with approvals, sim reports, and run records
    - Safety policy engine (deny-by-default, interlocks, role checks)
    - Simulator harness + demo flows (print/laser/CNC) with promotion gates (twin → live)
    - Reference adapters: OctoPrint/PrusaLink (3D print), LightBurn (laser), bCNC (CNC), camera capture pipeline
    - Real-time bus: UI (WebSocket/WebTransport) and device (MQTT/ROS2) adapters with heartbeats/backoff
    - Lab SOPs encoded as checklists; audit trails for jobs and e-stops
  - **Exit criteria:**
    - From dashboard: submit a job → sim run → safety checks → approved to live (in sandbox)
    - Two reference devices integrated end-to-end (sim + mock live)
    - Telemetry visible on project timeline; safety gates observable and testable

## Near Term — Virtual Focus

- Option A: **File Browser MVP** (Scope)
  - Grid/list views, previews for common types (image/video/audio/pdf/text/code/3D), metadata facets (type, tags, updated), drag/drop, and keyboard navigation.
  - Deliverables: `filesStore` (assets/tags/selection), `FileBrowser` component (grid/list), `previews` helpers, placeholder diff/versions affordances.
  - Acceptance: fast previews, graceful fallbacks, search/filter < 150ms on typical datasets.

- Option B: **AI Co‑Pilot MVP** (Scope)
  - Project digest card + side panel: “what changed, what’s next, risks” with explainability payloads and citations; pluggable provider interface with a local stub.
  - Deliverables: `aiInsights` provider interface, `CoPilotPanel`, sample summarizer using local heuristics (no network) to prove UX; opt‑in and dismissible.
  - Acceptance: clear, citeable summaries; no hard dependency on network; respects privacy toggles.

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
