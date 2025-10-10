# ODSAi Deployment Guide (ACA + Front Door)

This repository ships two deployables that work together:
- ODSUi Shell (React SPA) — containerized (Nginx) and deployed to Azure Container Apps (ACA)
- ODSUi LMS API (Node/Fastify) — separate containerized backend for courses, progress, tutor, certificates

This guide captures the production setup you described (source of truth), optimized for Azure Container Apps behind Azure Front Door + WAF, with Entra External ID (B2C) SSO enforced at the platform layer. The Static Web Apps (SWA) path is not used here.

---

## TL;DR for Cursor
- Do not migrate ODSUi Shell to SWA; keep it as a container (Nginx) using the Dockerfile + `default.conf` here.
- Keep LMS as a separate containerized app (own Dockerfile + ACA service); do not bundle into the shell image.
- No auth code in Shell/OWUI: SSO is enforced by ACA Auth (B2C) and/or Front Door at the edge.
- Build command: `npm ci && npm run build` → output `dist/`.
- Container exposes port 80 (Nginx).
- Headers and SPA fallback: configured in `default.conf`.
- Release process: ACR remote build → update ACA image to new tag → purge Front Door (for shell).
- Runtime config via `VITE_*` env vars (e.g., `VITE_API_BASE`) injected in ACA app settings.

---

## Architecture Overview
- Edge: Azure Front Door Premium + WAF (managed certs, global routing)
- ODSUi Shell: ACA app `odsui-shell-aca` (image from ACR), exposed via Front Door at `studio.opendesignschool.ai`
- OWUI: ACA app `owui-aca` (upstream image), optional Azure Files mount; Front Door at `owui.opendesignschool.ai`
- Website: WordPress in Azure App Service at `opendesignschool.ai` (OIDC via Entra External ID)
- Registry: ACR `odsaiacr2238111148` storing `odsuiappcodex:<tag>` images
- Auth: Entra External ID (B2C) user flow `CIAM_1_signup_signin` enforced by ACA Auth/Front Door; no SPA auth code needed

---

## ODSUi Shell (Container)

1) Dockerfile (Nginx) — place at repo root

```dockerfile
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ---- run (Nginx) ----
FROM nginx:1.27-alpine
# security headers + SPA fallback supplied by default.conf (see below)
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
```

2) Nginx config — `default.conf` at repo root

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # security headers (non-breaking)
  add_header X-Frame-Options SAMEORIGIN always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header Permissions-Policy "geolocation=(), microphone=()" always;

  # SPA fallback
  location / { try_files $uri $uri/ /index.html; }

  # light static caching
  location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
    expires 7d; access_log off; try_files $uri /index.html;
  }
}
```

3) Build & Release (ACR remote build + ACA update)

```bash
# parameters
RG=odsai-apps-rg
ACA_APP=odsui-shell-aca
ACR=odsaiacr2238111148
TAG="v$(date +%Y%m%d-%H%M)"
IMAGE="$ACR.azurecr.io/odsuiappcodex:$TAG"

# build in ACR (no local docker needed)
az acr build -r $ACR -t "$IMAGE" .

# deploy new revision to ACA
az containerapp update -g $RG -n $ACA_APP \
  --image "$IMAGE" --revision-suffix "$TAG"
```

4) Front Door purge (ensure latest UI at the edge)

```bash
az afd endpoint purge -g <edge-rg> --profile-name afd-odsai-prod \
  --domains studio.opendesignschool.ai \
  --content-paths "/index.html" "/assets/*"
```

5) Environment variables (optional API integration)
- Inject at ACA app level (no code changes required):
  - `VITE_API_BASE=https://opendesignschool.ai/wp-json` (example)
- Never hardcode in code; consume via `import.meta.env.VITE_*`

---

## OWUI (Open WebUI)
- Image: `ghcr.io/open-webui/open-webui:<tag>`
- ACA app name: `owui-aca`, target port 8080, min 0 / max 2
- Optional: mount Azure Files to `/app/backend/data` for persistence
- SSO: adopt ACA Auth (B2C) when ready (separate app registration)

---

## LMS API (Separate Container)
- Keep LMS as its own ACA service (e.g., `odsui-lms-aca`)
- Do not bundle into ODSUi Shell image
- Front Door can route by subdomain/path later (e.g., `lms.opendesignschool.ai`)

---

## Front Door + WAF (Routing Model)
- Origin groups:
  - `og-odsui-shell` → origin = `odsui-shell-aca.<region>.azurecontainerapps.io:443`
  - `og-owui` → origin = `owui-aca.<region>.azurecontainerapps.io:443`
- Custom domains:
  - `studio.opendesignschool.ai` → `og-odsui-shell`
  - `owui.opendesignschool.ai` → `og-owui`
- Keep WP either via FD or direct App Service with managed cert

---

## SSO / Entra External ID (B2C)
- Tenant: ODSAi External ID (B2C)
- User flow: `CIAM_1_signup_signin` (enable MFA as required)
- Issuer URL pattern:
  `https://<tenant>.ciamlogin.com/<tenant>.onmicrosoft.com/CIAM_1_signup_signin/v2.0/`
- Each app has its own registration & redirect URIs, all using the same user flow
- Shell callback examples (ACA & custom domain):
  - `https://odsui-shell-aca.<region>.azurecontainerapps.io/.auth/login/aad/callback`
  - `https://studio.opendesignschool.ai/.auth/login/aad/callback`

> Because ACA Auth + Front Door handle SSO, the SPA doesn’t need auth code or MSAL.

---

## Local Development
```bash
npm ci
npm run dev
# build bundle
npm run build
```

---

## Notes for Contributors / Cursor
- Keep build output under `dist/` (Vite default)
- Do not migrate the shell to SWA — we deploy as a container (Nginx) per above
- LMS remains a separate containerized service
- Use `VITE_*` envs for any runtime config (injected at ACA app)
- For scale, add Redis + metric alerts; IaC modules are under `infra/bicep/`
