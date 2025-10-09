# Project History

- 2025-09-26: Clean start on local folder; cloned original repo `odsai/ODSUiAppCodex` into `ODSAiStudio`. Added `AGENTS.md` and docs to persist context across sessions.
- 2025-09-26: Removed the header strip and dashboard user-info/logout controls from the top of the page per UI request.
- 2025-09-26: Refined floating pill menu with smoother motion, added in-menu logout option, swapped to uniform line icons, removed auto-alignment snap, and made the stack flip up/down based on available space.
- 2025-09-26: Reworked admin settings with tabbed interface (Apps, Branding, Behavior), dynamic tool configuration, theme customization (palettes, uploads), and tied pill menu to configurable apps.
- 2025-09-26: Added stricter ESLint setup (TypeScript + React hooks) and resolved legacy warnings to keep the repo gold-standard clean.
- 2025-09-26: Introduced Azure AD SSO configuration (Settings → Single Sign-On) and MSAL-based login/logout with fallback mock auth.
- 2025-09-26: Simplified app configuration to link-only entries (no internal route selectors), added per-app custom icons, and refreshed the pill menu to always embed URLs.
- 2025-09-27: Consolidated LMS roadmap with Phase 1 sub-phases and future phases 4-6 aligned to OWUI integration goals; updated `docs/TASKS.md` accordingly.
- 2025-09-27: Phase 1.0 groundwork underway — LMS frontend now uses bearer tokens for courses/progress, adds retryable progress upserts, and removes ad-hoc `any` usage in quiz handling.
- 2025-09-27: Refined multi-phase roadmap (Phase 1.0–1.3, 1.5, 2–6) with deeper OWUI/LMS integration details; synced plan in `docs/TASKS.md`.
- 2025-09-27: Implemented OWUI tutor workflow mapping with conversation persistence and new LessonPlayer tutor panel.
- 2025-09-27: Drafted `docs/AboutOpenDesignSchoolAi.md` outlining the platform vision, historical roots, and community roadmap.
- 2025-09-27: Added tutor resiliency (retries + circuit breaker), `/metrics` endpoint, and OWUI canary workflow; surfaced metrics in Settings.
- 2025-09-27: Added policy docs (Privacy, Licensing, GitHub/HF Usage) and initial `course.yaml` + lesson front‑matter spec with templates.
- 2025-09-27: Documented certificate pipeline (`docs/certificates.md`) and improved stored download UX.
- 2025-10-10: Hardened SWA deployment pipeline with environment-gated workflows and split prod/dev CSP configs.
- 2025-10-10: Added App Insights telemetry hooks (SPA + LMS API) and established incident/data deletion runbooks with finalized privacy policy.
- 2025-10-15: Introduced optional Redis cache and alerting Bicep modules plus alerting runbook to close remaining enterprise blockers.
