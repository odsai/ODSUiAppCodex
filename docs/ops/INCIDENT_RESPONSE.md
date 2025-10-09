# Incident Response Runbook

## 1. Preparation
- **Core contacts:** `security@opendesignschool.ai`, Ops on-call (Teams: `#ops-oncall`), Product owner (Teams: `#odsui-leadership`).
- **Systems covered:** Azure Static Web Apps (frontend), Azure Container Apps (LMS API), Cosmos DB, Redis cache, Azure Front Door, GitHub Actions, Key Vault, OWUI adapter.
- **Tools:** Azure Portal dashboards, Application Insights, Log Analytics workspace, GitHub audit logs, PagerDuty escalation.

## 2. Triage (≤15 minutes)
1. **Acknowledge alert** (PagerDuty/App Insights).
2. **Classify severity:**
   - Sev0: Data breach, widespread outage (>50% users), active exploit.
   - Sev1: Limited outage (<50%), suspicious auth patterns, degraded performance without data risk.
   - Sev2: Minor service degradation, non-security defect, false positive.
3. **Assign roles:**
   - *Incident Commander* – coordinates response, keeps timeline.
   - *Communications Lead* – internal updates, stakeholder comms.
   - *Technical Lead(s)* – frontend, backend, infra.

## 3. Containment
- **Security events:** Revoke compromised credentials (Azure AD, Key Vault secrets), block offending IPs via Front Door/WAF, disable affected automation credentials.
- **Availability events:** Scale out ACA, fail over to standby region (if available), put OWUI into degraded mode via feature flags.
- **Data integrity:** Snapshot Cosmos DB containers; enable write-protection if integrity risk exists.

## 4. Eradication & Recovery
1. Identify root cause using telemetry (App Insights traces, Log Analytics queries).
2. Deploy hotfix through staging → production pipeline (manual approvals enforced).
3. Validate via health checks (`/health`, `/ready`), synthetic canary workflow, and App Insights live metrics.
4. Re-enable any temporarily disabled features in a controlled manner.

## 5. Communication
- Initial stakeholder update within 30 minutes (status, scope, next update time).
- Customer-facing incident post (Status Page / email) for Sev0–Sev1.
- Final summary with impact matrix, timelines, and remediation steps delivered within 48 hours.

## 6. Post-Incident Review (within 5 business days)
1. Collect evidence: timelines, dashboards, PRs, logs (retain for 90 days).
2. Conduct blameless retrospective; capture action items with owners and due dates.
3. Update `docs/PROJECT_HISTORY.md` and `docs/DECISIONS.md` for policy or architecture changes.
4. File automation/backlog tickets to address gaps (monitoring, tests, playbooks).

## 7. Continuous Improvement
- Quarterly dry runs of Sev0/Sev1 scenarios.
- Validate incident channels and on-call rotation monthly.
- Review alert thresholds and App Insights dashboards after each incident.
