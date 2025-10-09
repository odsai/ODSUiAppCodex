# Data Deletion & GDPR Article 17 Workflow

## Scope
- Applies to learner/instructor personal data stored in Cosmos DB, Redis cache, Blob storage (certificates), and App Insights/Log Analytics.
- Requests can originate from data subjects, legal, or institutional administrators.

## Intake
1. Email `privacy@opendesignschool.ai` or submit portal request.
2. Log request in the privacy tracker (ServiceNow/Jira ticket) with requester identity, scope, and due date (30 days max).
3. Verify identity via Azure AD (institutional accounts) or signed affidavit for alumni.

## Fulfilment Steps
1. **Freeze processing**: Disable automated syncs for the subject’s tenant (feature flag) to avoid re-ingestion.
2. **Locate data**:
   - Cosmos DB: `progress`, `courses`, `aiInteractions`, `certificates` containers (partition by `tenantId`).
   - Blob Storage: certificate assets under `/<tenant>/<course>/<userId>`.
   - Redis: search keys matching `tenant:<tenantId>:user:<userId>:*`.
   - App Insights: query `traces` and `requests` tables for `user_Id == "<userId>"`.
3. **Anonymise or delete**:
   - Cosmos: soft-delete by archiving to secure storage (if legal hold) then purge using bulk executor.
   - Blob: remove PDFs/HTML, revoke SAS tokens, log deletion hash.
   - Redis: delete keys; confirm TTL clears within SLA.
   - App Insights/Log Analytics: submit purge request via Azure Purge API scoped to timestamp and user identifier.
4. **Confirm removal**: Run verification queries (Cosmos query, Blob listing, App Insights purge status).

## Close-Out
1. Notify requester with summary of removed data and timestamp.
2. Update privacy tracker with completion evidence.
3. Add anonymised entry to `docs/PROJECT_HISTORY.md` if process updates were required.

## Prevention & Automation
- Implement scheduled jobs to expire inactive learner data per retention policy.
- Ensure new services write tenant/user metadata to simplify targeted purges.
- Add automated purge scripts (see `services/compliance-tools`) to reduce manual effort; run monthly dry runs.
