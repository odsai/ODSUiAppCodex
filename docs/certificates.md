# Certificate Pipeline (Draft v1.0)

ODSAi LMS can render certificates both as HTML and PDF. This document captures the current behaviour so instructors and operators know what to expect.

## Eligibility
- All lessons in the course must be marked `completed`.
- If a lesson is type `quiz`, the latest stored score must meet or exceed the configured pass threshold (default 0.7).
- The course route returns:
  ```json
  { "eligible": true|false, "url": "/courses/<id>/certificate/pdf", "stored": true|false }
  ```
- Frontend banner shows “Generate certificate” until a stored copy exists.

## Rendering
- **HTML** (`GET /courses/:courseId/certificate/download`)
  - Simple responsive card; useful for quick printing or embedding in LMS email.
- **PDF** (`GET /courses/:courseId/certificate/pdf`)
  - Generated via PDFKit; includes course title, learner ID, tenant metadata, issue date.

## Persistence (optional)
- Set `CERT_STORAGE_DIR` before starting `services/lms-api`.
- Files stored at `<dir>/<tenantId>/<courseId>/<userId>.{html,pdf}`.
- Regeneration will reuse stored files when `stored === true`.

### Example setup
```bash
export CERT_STORAGE_DIR=/srv/odsui-certificates
npm run dev --prefix services/lms-api
```

Ensure the directory exists and the process user has write permissions.

## Future Enhancements (Phase 1.2 tracking)
- Instructor-facing copy: editable certificate templates, custom logos, signatures.
- Admin UI: list generated certificates, revoke/reissue controls, audit log.
- Email delivery: optional integration with transactional email service.

---
Updates should be recorded in `docs/PROJECT_HISTORY.md`.
