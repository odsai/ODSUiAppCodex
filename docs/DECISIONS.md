# Decision Log (ADR‑lite)

- D-0001: Keep hash-based routing in `App.tsx` for simplicity; no react-router unless requirements change.
- D-0002: Persist project context in-repo via `AGENTS.md`, `docs/PROJECT_HISTORY.md`, and `docs/TASKS.md` to avoid re‑introducing the project in new sessions.
- D-0003: Maintain strict CSP via `staticwebapp.config.json`; whitelist only required origins for embeds (`connect-src` and `frame-src`).
- D-0004: Represent pill-menu tools as configurable link entries managed via admin settings, including optional custom icons; the shell embeds them in an iframe by default instead of mapping to internal routes.
- D-0005: Standardise authentication on Azure Entra ID (Azure AD) using PKCE-based SPA flows; all apps read configuration from repo settings, and secrets stay outside the frontend.
- D-0006 (2025-10-10): Instrument SPA and LMS API with Azure Monitor / Application Insights (opt-in via connection strings), enforce environment-gated deployments, and document incident/data-deletion playbooks as release criteria.
- D-0007 (2025-10-15): Provide optional Redis cache and metric alert modules via Bicep; adoption becomes mandatory for production scale and alerting SLAs once traffic exceeds pilot thresholds.
- LMS-0001 (2025-09-27): Adopt a service-oriented LMS backend running on Azure Container Apps with a Node.js (Fastify/Nest) stack, Cosmos DB (PostgreSQL API) for course/progress data, Azure Cache for Redis for session metadata, and Azure Functions for background workflows. Provide infrastructure as code via Bicep/Terraform, enforce tenant isolation via `tenantId` partitions, and expose REST endpoints documented in `LMS/API-SCHEMA.md`. All OWUI interactions go through a versioned adapter with contract tests.
