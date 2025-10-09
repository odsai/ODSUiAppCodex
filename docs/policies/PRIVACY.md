# Privacy & Data Protection Policy (ADR‑lite)

Status: Approved v1.0 (2025-10-10)

## Scope
- Applies to all ODSUi/ODS Ai LMS services, websites, and CI workflows.
- Covers personal data (PII), authentication tokens, content submissions, logs, analytics, and exported reports.

## Principles
- Least data: Collect the minimum required to operate learning features.
- PII segregation: PII stays in the LMS backend (Cosmos) only—never in public repos or Hugging Face datasets.
- Consent + control: Learners opt in to public attribution; private by default for minors or sensitive work.
- Right to remove: Clear, documented process to request removal of public artefacts.
- Transparency: Document data flows, retention, and third‑party processors.

## Data Map (overview)
- LMS Auth: Azure Entra ID (SSO) subject ID, roles; short‑lived tokens in browser memory.
- LMS Core: enrollments, progress, quiz scores, tutor transcripts (aiInteractions), certificates.
- Content: course text/media; large assets on CDN/Blob; public artefacts must be licensed.
- GitHub: open course repos; Issues/PRs/Discussions for critique; avoid PII.
- Hugging Face: open datasets/models/demos; no PII.

## Storage & Retention
- Progress + transcripts: retained while the course is active; anonymised aggregation for analytics.
- Logs: application logs max 30 days in dev, 90 days in prod; redact tokens.
- Certificates: stored as derived artefacts; revocable if content is removed.

## Security Controls
- Transport: TLS for all public endpoints.
- Identity: Azure Entra ID (PKCE SPA) + audience scoping on API.
- Secrets: Key Vault + GitHub Actions secrets; never commit secrets.
- Partitioning: `tenantId` shard in Cosmos; per‑tenant authz checks.

## Public Contributions (PII Controls)
- Public repos and datasets must exclude PII. Use pseudonyms or cohort handles.
- CI includes a PII linter (regex + heuristics) to block accidental commits of emails/phone numbers/IDs.
- Moderation playbooks for complaints and takedowns.

## Requests & Redress
- Contact: privacy@opendesignschool.ai
- Process: acknowledge within 7 business days, resolve within 30 where applicable.

---
This document evolves with practice; log changes in `docs/PROJECT_HISTORY.md`.
