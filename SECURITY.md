# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `main`  | ✅        |
| tags    | ↔️ See release notes |

Security fixes are applied to the `main` branch and included in the next scheduled release. Older releases receive fixes only when explicitly noted.

## Reporting a Vulnerability

1. Email **security@opendesignschool.ai** with:
   - A clear description of the issue and potential impact.
   - Steps to reproduce or a proof of concept.
   - Any relevant logs, stack traces, or network captures.
2. Alternatively, open a private advisory at <https://github.com/odsai/ODSUiAppCodex/security/advisories/new>.

Please do **not** file public issues for security reports.

We target an initial response within **2 business days**. Critical issues are triaged immediately and tracked in a private incident log until remediation ships.

## Handling Process

- Confirm and reproduce the report.
- Assess severity using CVSS and determine affected scope.
- Develop and validate a fix (including regression tests).
- Coordinate disclosure with the reporter and, if needed, trusted partners.
- Publish a security advisory and update changelogs and documentation.

## Disclosure Expectations

We request a **90-day disclosure window** unless a shorter timeline is mutually agreed. If a vulnerability is being actively exploited, coordinated disclosure will happen sooner with patched releases and mitigations documented.
