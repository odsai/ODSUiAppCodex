# Decision Log (ADR‑lite)

- D-0001: Keep hash-based routing in `App.tsx` for simplicity; no react-router unless requirements change.
- D-0002: Persist project context in-repo via `AGENTS.md`, `docs/PROJECT_HISTORY.md`, and `docs/TASKS.md` to avoid re‑introducing the project in new sessions.
- D-0003: Maintain strict CSP via `staticwebapp.config.json`; whitelist only required origins for embeds (`connect-src` and `frame-src`).
- D-0004: Represent pill-menu tools as configurable link entries managed via admin settings; the shell embeds them in an iframe by default instead of mapping to internal routes.
- D-0005: Standardise authentication on Azure Entra ID (Azure AD) using PKCE-based SPA flows; all apps read configuration from repo settings, and secrets stay outside the frontend.
