# ODSUiAppCodex

[![CI](https://github.com/odsai/ODSUiAppCodex/actions/workflows/ci.yml/badge.svg)](https://github.com/odsai/ODSUiAppCodex/actions/workflows/ci.yml)
[![Azure SWA Deploy](https://github.com/odsai/ODSUiAppCodex/actions/workflows/azure-static-web-apps.yml/badge.svg)](https://github.com/odsai/ODSUiAppCodex/actions/workflows/azure-static-web-apps.yml)
<br/>
CI/Deploy: GitHub Actions with AZURE_STATIC_WEB_APPS_API_TOKEN.

Repository: https://github.com/odsai/ODSUiAppCodex
Live: https://studio.opendesignschool.ai

## Overview
ODSUiAppCodex hosts the ODSUi Shell app, a unified interface for open-source AI tools in Design Pedagogy and Practice.
Primary site: https://studio.opendesignschool.ai

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

## Custom Domain Setup (GoDaddy + Azure App Service)
Use these steps to bind a subdomain like `studio.opendesignschool.ai` to an Azure App Service.

Prereqs
- An Azure App Service (Basic tier or higher for custom domains).
- DNS control for `opendesignschool.ai` in GoDaddy.

1) Get your app’s default hostname
- Azure Portal → Your App Service → Overview → copy `*.azurewebsites.net`.

2) Start custom domain add flow in Azure
- App Service → Custom domains → Add custom domain
- Enter `studio.opendesignschool.ai` → Validate
- Azure shows a TXT record for verification:
  - Name/Host: `asuid.studio`
  - Value: a GUID (copy exactly)
  Keep this Azure tab open.

3) Add DNS records in GoDaddy
- Remove any conflicting record named `studio` (A/CNAME/Forwarding).
- Add TXT (verification):
  - Type: TXT
  - Name/Host: `asuid.studio`
  - Value: the GUID from Azure (no quotes/spaces)
  - TTL: 1 hour (or default)
- Add CNAME:
  - Type: CNAME
  - Name/Host: `studio`
  - Value/Target: `<yourapp>.azurewebsites.net`
  - No protocol (`https://`), no trailing dot or spaces.

4) Complete in Azure
- Back in the “Add custom domain” dialog → Validate again → Add.
- Enable HTTPS for `studio.opendesignschool.ai` (Azure auto‑issues SSL).

5) Verify
- `nslookup studio.opendesignschool.ai` resolves to `*.azurewebsites.net`.
- `curl -I https://studio.opendesignschool.ai` returns 200/301.
- Azure → Custom domains shows “Active” with a certificate.

Troubleshooting (GoDaddy “Record data is invalid”)
- Ensure Value is only the hostname (e.g., `myapp.azurewebsites.net`).
- Remove any existing record named `studio` before adding the new CNAME.
- Paste into a plain editor to avoid hidden whitespace.
