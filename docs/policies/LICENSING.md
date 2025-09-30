# Licensing Guide

Status: Draft v1.0

## Goals
- Encourage openness with clear attribution.
- Match license to artefact type (code, content, data, models).
- Ensure downstream reuse while protecting contributor rights.

## Defaults (recommendations)
- Code: Apache-2.0 (or MIT if preferred). Apache offers patent grants across institutions.
- Course content (text/figures): CC BY 4.0 or CC BY-SA 4.0 (choose one per repo and document).
- Datasets: CC BY 4.0, ODC‑By, or another open data license that fits the corpus.
- Model configs/workflows: Apache-2.0; if derived from third parties, honor upstream.

## Required Files
- `LICENSE` at repo root (exact SPDX).
- `ATTRIBUTION.md` listing authors, sources, and third‑party assets.
- For datasets/models: Data/Model Cards describing provenance, intended use, and limitations.

## Third‑Party Content
- Include license notices for embedded assets (icons, images, fonts, datasets).
- If unsure, prefer linking over embedding; document source URLs and terms.

## Dual Licensing
- Allowed only with explicit approval from maintainers. Document rationale in `docs/DECISIONS.md`.

## Contributor License Agreement (CLA)
- Not required for general contributions. For large institutional contributions, maintainers may request a lightweight DCO/CLA.

---
This guide evolves; log notable changes in `docs/PROJECT_HISTORY.md`.
