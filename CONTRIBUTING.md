# Contributing to ODSUiAppCodex

Thanks for your interest in contributing! Repo: https://github.com/odsai/ODSUiAppCodex

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

## Branch Protection (Recommended)
Set these on the `main` branch in GitHub → Settings → Branches:
- Require a pull request before merging (at least 1 approving review)
- Require status checks to pass before merging:
  - CI (lint/typecheck/build)
  - Azure Static Web Apps CI/CD (deployment)
- Dismiss stale approvals when new commits are pushed
- Restrict force pushes and deletions

## Deployment (Azure Static Web Apps)
This repo includes `.github/workflows/azure-static-web-apps.yml`.
- Create an Azure Static Web App and get the deployment token.
- In GitHub → Settings → Secrets and variables → Actions, add:
  - `AZURE_STATIC_WEB_APPS_API_TOKEN` = your SWA deployment token
- Push to `main` to trigger build and deploy.
