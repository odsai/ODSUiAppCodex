# Contributing to ODSUi Shell

Thanks for your interest in contributing!

## Ground Rules
- Follow the truth document at the repo root: `systemprompt-ODSUI-dev`. It is authoritative.
- Proposed changes go under “Extensible Sections → Proposed” first; promote to Approved only after sign-off.
- Every approved change must bump SemVer and add a dated Changelog entry in the truth doc.

## Workflow
1. Create a branch from `main`.
2. Update code and, if needed, the truth doc.
3. Run locally: `npm ci && npm run build`.
4. Open a PR using the template; ensure CI passes.
5. Request review.

## CI
CI runs lint (non-blocking), typecheck, and build on Node 20.

## Code Style
- TypeScript + React 18
- TailwindCSS for styling
- Keep components small and accessible (ARIA, focus, contrast)

