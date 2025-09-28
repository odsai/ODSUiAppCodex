# Project History

- 2025-09-26: Clean start on local folder; cloned original repo `odsai/ODSUiAppCodex` into `ODSAiStudio`. Added `AGENTS.md` and docs to persist context across sessions.
- 2025-09-26: Removed the header strip and dashboard user-info/logout controls from the top of the page per UI request.
- 2025-09-26: Refined floating pill menu with smoother motion, added in-menu logout option, swapped to uniform line icons, removed auto-alignment snap, and made the stack flip up/down based on available space.
- 2025-09-26: Reworked admin settings with tabbed interface (Apps, Branding, Behavior), dynamic tool configuration, theme customization (palettes, uploads), and tied pill menu to configurable apps.
- 2025-09-26: Added stricter ESLint setup (TypeScript + React hooks) and resolved legacy warnings to keep the repo gold-standard clean.
- 2025-09-26: Introduced Azure AD SSO configuration (Settings → Single Sign-On) and MSAL-based login/logout with fallback mock auth.
- 2025-09-26: Simplified app configuration to link-only entries (no internal route selectors) and refreshed the pill menu to always embed URLs.
