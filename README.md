# ODSAiStudioCodex

[![CI](https://github.com/odsai/ODSUiAppCodex/actions/workflows/ci.yml/badge.svg)](https://github.com/odsai/ODSUiAppCodex/actions/workflows/ci.yml)
[![Azure SWA Deploy](https://github.com/odsai/ODSUiAppCodex/actions/workflows/azure-static-web-apps.yml/badge.svg)](https://github.com/odsai/ODSUiAppCodex/actions/workflows/azure-static-web-apps.yml)
<br/>
CI/Deploy: GitHub Actions with AZURE_STATIC_WEB_APPS_API_TOKEN.

Repository: https://github.com/odsai/ODSUiAppCodex
Live: https://opendesignschool.ai

## Overview
ODSAiStudio hosts the ODSUi Shell app, a unified interface for open-source AI tools in Design Pedagogy and Practice.
Primary site: https://opendesignschool.ai

> **Architecture at a glance:**  
> The repo ships two deployables that work together:
> - **ODSUi shell (React SPA)** — built with Vite and deployed to Azure Static Web Apps (static hosting + CDN).
> - **ODSUi LMS API** — a Node/Fastify backend (under `services/lms-api/`) packaged as a container for Azure Container Apps. It supplies courses, progress, tutor flows, certificates, etc.
>
> The shell can run in “mock” mode for demos, but production requires deploying the LMS API separately and pointing the shell’s settings (`Settings → LMS`) at that API endpoint.

## Tech Stack
- React 18 + TypeScript + Vite
- TailwindCSS
- Zustand for state
- GitHub Actions CI/CD
- Azure Static Web Apps hosting

## Local Development
```bash
npm install
npm run dev
```

## Deploy to Azure SWA
This repo includes a ready-to-use GitHub Actions workflow: `.github/workflows/azure-static-web-apps.yml`.

1) Create an Azure Static Web App (Build preset: Vite)
2) In GitHub → Settings → Secrets and variables → Actions, add:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` (value = SWA Deployment Token from Azure)
   - Optional: `VITE_APPINSIGHTS_CONNECTION_STRING` (to enable SPA telemetry)
3) Push to `main` — the workflow builds (`npm ci && npm run build`) and deploys `dist/`.

## Content Security Policy (CSP)
The app ships with a safe-by-default CSP in `staticwebapp.config.json`. When embedding external tools (e.g., OWUI, Penpot, Flowise), whitelist their domains under `frame-src` and `connect-src`.

Edit: `staticwebapp.config.json`

Example (replace the example domains with yours):

```
{
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws: wss: http://localhost:* https://owui.example.com https://penpot.example.com https://flowise.example.com; frame-src 'self' http://localhost:* https://owui.example.com https://penpot.example.com https://flowise.example.com;"
  }
}
```

Notes:
- We removed `X-Frame-Options` to avoid conflicts; CSP governs framing.
- Keep localhost allowances for dev; remove them for production if not needed.

## OWUI Integration (Dev)

1. Log in to OWUI at [https://odsui-fd-age5hkdqbtfegua0.z03.azurefd.net](https://odsui-fd-age5hkdqbtfegua0.z03.azurefd.net).
2. In **Settings → Account**, generate an API token.
3. Export the environment variables before starting the LMS API:

   ```bash
   export OWUI_BASE_URL=https://odsui-fd-age5hkdqbtfegua0.z03.azurefd.net
   export OWUI_API_KEY="<paste-your-token>"
   export AUTH_DEV_ALLOW=1   # optional dev bypass
   npm run dev --prefix services/lms-api
   ```

4. In the frontend (Settings → LMS), set **OWUI workflow base URL** to the same host and use “Test OWUI” to verify.
5. Ensure lessons reference an `owuiWorkflowRef` (via Admin dashboard or course repo metadata) to enable the tutor panel.

## Certificates & Storage

- Certificates render as HTML (`/certificate/download`) and PDF (`/certificate/pdf`).
- To persist generated files, set `CERT_STORAGE_DIR` before starting the LMS API. Files are stored under `<dir>/<tenant>/<course>/<user>.{html,pdf}`.
- Example:
  ```bash
  export CERT_STORAGE_DIR=/tmp/odsui-certificates
  npm run dev --prefix services/lms-api
  ```
  When learners regenerate certificates, ODSUi will reuse stored copies when available.

## Local Preview

Build and preview the production bundle locally:

```
npm run build
npm run preview
```

Vite preview runs on port 4173 by default.

## Next Steps (Ops Checklist)
- Verify SWA deploy run and site health
  - `gh run list --workflow azure-static-web-apps.yml --limit 5`
  - `curl -I https://<your-swa-host>`
- Frontend telemetry (optional, recommended)
  - Add `VITE_APPINSIGHTS_CONNECTION_STRING` as a GitHub secret; SWA workflows pass it at build time
- CSP updates
  - Add your real tool and API domains to `connect-src`/`frame-src` in `staticwebapp.config.json` (prod) and dev config
- Alerts (optional, recommended)
  - Deploy metric alerts via Bicep: `infra/bicep/main.bicep` with `deployAlerts=true` and your App Insights + Action Group IDs
- Redis (later, for scale)
  - Provision via Bicep with `deployRedis=true`; wire into API as needed
- LMS API (later)
  - Deploy as a Container App; set CORS to SWA host; update Settings → LMS `apiBaseUrl`; add API host under CSP `connect-src`
- Testing
  - `npm run lint`, `npm run test`, `npm run build` (required for PRs)
  - Consider adding E2E (Playwright) and environment-specific alert thresholds
- Observability
  - Import the baseline App Insights workbook in `docs/ops/APP_INSIGHTS_WORKBOOK.md`
  - Configure Trivy security scans (`.github/workflows/trivy.yml`) with your desired severity gates
