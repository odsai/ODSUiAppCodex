# ODSUi LMS API (scaffold)

This service backs the LMS module described in `LMS/ARCHITECTURE.md`. It is a Fastify + TypeScript application targeting Azure Container Apps with Cosmos DB, Redis, and Functions per ADR `LMS-0001`.

## Features (initial skeleton)
- Fastify app with security headers, sensible errors, and structured logging.
- Request-level auth/tenant middleware stubs (replace with Azure AD validation).
- Draft endpoints aligned with `LMS/API-SCHEMA.md` (`/courses`, `/courses/:id`, progress, tutor invocation).
- Zod schemas for payload validation.

## Getting Started
```bash
cd services/lms-api
npm install
npm run dev
```

The dev server listens on port `8080` by default. By default it uses an in-memory data store.

To enable Cosmos DB (optional):
```bash
export DATA_BACKEND=cosmos
export COSMOS_ENDPOINT="https://<your-account>.documents.azure.com:443/"
export COSMOS_KEY="<primary-or-connection-key>"
export COSMOS_DB="odsui-lms"
export COSMOS_CONTAINER_COURSES="courses"
export COSMOS_CONTAINER_PROGRESS="progress"
```

## Scripts
- `npm run dev` – start Fastify with `ts-node-dev`.
- `npm run build` – compile to `dist/` via TypeScript.
- `npm run start` – run the compiled output.
- `npm run lint` – ESLint with Standard + TypeScript rules.

## Next Steps
1. Implement Azure AD token validation inside `src/plugins/auth.ts`.
2. Replace in-memory repository with Cosmos-backed repo (`DATA_BACKEND=cosmos`) and add read/write tests.
3. Add integration tests (Pact or Supertest) to exercise the routes.
4. Wire IaC modules for Container Apps, Cosmos, Redis, Key Vault, and Front Door.

Keep decisions and API changes in sync with `docs/DECISIONS.md` and `LMS/API-SCHEMA.md`.
