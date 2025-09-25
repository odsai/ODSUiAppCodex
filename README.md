# ODSUiAppCodex

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

## Deployment (Azure SWA)
- Push repo to GitHub
- Create Azure Static Web App → link repo
- Build preset: Vite
- Output folder: dist
- Done 🚀

## Content Security Policy (CSP)
The app ships with a safe-by-default CSP in `staticwebapp.config.json`. When embedding external tools (e.g., OWUI, Penpot, Flowise), whitelist their domains under `frame-src` and `connect-src`.

Edit: `odsui-shell/staticwebapp.config.json`

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
If you have the bundled Node:

```
cd odsui-shell
export PATH="$PWD/../node-v20.11.0-darwin-x64/bin:$PATH"
npm run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

Open: http://127.0.0.1:5173
