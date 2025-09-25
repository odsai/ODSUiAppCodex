# ODSUiAppCodex

[![CI](https://github.com/odsai/ODSUiAppCodex/actions/workflows/ci.yml/badge.svg)](https://github.com/odsai/ODSUiAppCodex/actions/workflows/ci.yml)
[![Azure SWA Deploy](https://github.com/odsai/ODSUiAppCodex/actions/workflows/azure-static-web-apps.yml/badge.svg)](https://github.com/odsai/ODSUiAppCodex/actions/workflows/azure-static-web-apps.yml)

Repository: https://github.com/odsai/ODSUiAppCodex

## Overview
ODSUiAppCodex hosts the ODSUi Shell app, a unified interface for open-source AI tools in Design Pedagogy and Practice.

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
3) Push to `main` — the workflow builds (`npm ci && npm run build`) and deploys `dist/`.

Notes
- `app_location`: `/` (repo root)
- `output_location`: `dist`
- No API used (leave `api_location` empty)

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

## Local Preview

Build and preview the production bundle locally:

```
npm run build
npm run preview
```

Vite preview runs on port 4173 by default.
