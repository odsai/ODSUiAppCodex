# Decision Log (ADR‑lite)

- D-0001: Keep hash-based routing in `App.tsx` for simplicity; no react-router unless requirements change.
- D-0002: Persist project context in-repo via `AGENTS.md`, `docs/PROJECT_HISTORY.md`, and `docs/TASKS.md` to avoid re‑introducing the project in new sessions.
- D-0003: Maintain strict CSP via `staticwebapp.config.json`; whitelist only required origins for embeds (`connect-src` and `frame-src`).

