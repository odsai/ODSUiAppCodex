# Platform Usage — GitHub & Hugging Face

Status: Draft v1.0

## Intent
- ODSUi is an interface to open source—never a substitute for platform ToS.
- Use GitHub/Hugging Face in ways aligned with their intended purposes.

## GitHub (intended usage)
- Repos-as-courses: `course.yaml`, `modules/*/lesson.md`, `assets/` (large files via CDN/Blob).
- Critique: Issues/Discussions for feedback; Pull Requests for review rituals.
- CI: GitHub Actions for a11y, license, PII linting; Pages for exhibitions; Codespaces for setup.
- Permissions: org/team mapping to cohorts; least privilege; GitHub App with minimal scopes.
- Hygiene: ETag caching + webhooks; respect rate limits; no scraping.

## Hugging Face (intended usage)
- Datasets: open educational corpora with Dataset Cards, licenses, and PII scrubs.
- Models: Model Cards detailing data sources, intended use, limitations.
- Spaces: demos with safety rails; rate limits; content moderation aligned with HF policies.
- No PII: never upload personal learner data.

## Guardrails
- Public artefacts opt‑in; default private for sensitive content.
- CI PII linter blocks accidental emails/IDs/phones.
- Attribution required; clear LICENSE + attribution files.
- Takedown & moderation playbooks for misuse.

## Portability & Sovereignty
- Support GitHub Enterprise Server/Gitea/GitLab if required; importer/exporter design keeps content portable.

---
This guidance evolves; changes are logged in `docs/PROJECT_HISTORY.md`.
