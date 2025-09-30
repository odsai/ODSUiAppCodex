# Course Repository Specification (Draft v1.0)

This spec defines how a course is represented in a Git repository for ingestion by the ODSUi LMS.

## Files & Folders
- `course.yaml` — course metadata and syllabus
- `modules/<order>-<slug>/lesson.md` — lesson content (Markdown with YAML front‑matter)
- `assets/` — optional static assets (large files via CDN/Blob preferred)

## course.yaml
```yaml
id: course-<slug>
version: 1
visibility: public   # or private
license: CC-BY-4.0   # SPDX identifier
maintainers:
  - name: Jane Mentor
    handle: janementor
    contact: jane@example.org
branding:
  banner: https://cdn.example.com/path/banner.png
  color: "#2563EB"
title: "Design Systems: Foundations"
description: |
  This course introduces…
tags: [design, systems, ui]
cohorts:
  - id: 2025-spring
    startsAt: 2025-01-15
    endsAt: 2025-05-15
modules:
  - id: m1
    title: Foundations
    lessons:
      - path: modules/01-foundations/lesson.md
  - id: m2
    title: Components
    lessons:
      - path: modules/02-components/lesson.md
```

## lesson.md front‑matter
```yaml
---
id: m1l1
title: Welcome to the Studio
type: reading   # video | reading | embed | quiz | lab
estimatedDuration: 15
owuiWorkflowRef: lesson-tutor-workflow
quiz:
  # single-question form
  question: Which are good practices?
  options:
    - { id: a, text: "Be specific", correct: true }
    - { id: b, text: "Be ambiguous" }
  # or multi-question form
  # questions:
  #   - id: q1
  #     text: Basics
  #     options:
  #       - { id: a, text: "Be specific", correct: true }
resources:
  - { label: Syllabus, url: https://example.org/syllabus.pdf }
---

# Lesson Content

Markdown body here…
```

## Validation Rules (subset)
- `id` unique within repo; `version` integer ≥ 1; SPDX license in `license`.
- Module lesson paths must exist.
- Lessons: `type` one of `video|reading|embed|quiz|lab`; quiz schema validated accordingly.
- `owuiWorkflowRef` optional; if present, used by tutor panel.

## Import Semantics
- LMS fetches via GitHub GraphQL with ETags; reindex on webhook push.
- Large media fetched from CDN/Blob; repository should link rather than embed heavy files.

---
This spec evolves; proposed changes via PRs to `docs/course-spec.md`.
