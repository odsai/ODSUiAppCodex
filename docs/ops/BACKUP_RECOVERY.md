# Backup & Recovery (Cosmos + SWA)

This is a minimal, actionable runbook to back up and restore critical data for ODSUi deployments.

## Cosmos DB (SQL API)

Strategy: use Azure Cosmos automatic backups (periodic) and point-in-time restore for disaster scenarios.

Recommended settings
- Backup policy: Periodic (every 4 hours), Retention: 7–30 days per environment.
- Consistency: Session (already configured via IaC).

Verify backup policy
```bash
az cosmosdb show -n <account> -g <rg> --query backupPolicy
```

Point-in-time restore (PITR) to a new account
```bash
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)  # pick time just before incident
az cosmosdb restore --resource-group <rg> \
  --target-database-account-name <restored-account-name> \
  --restore-timestamp $TS \
  --source-database-account <account>
```

Container export (optional, for periodic archives)
```bash
# Use Azure Data Factory / Functions for regular exports if needed.
```

Application steps
1. Switch LMS API `COSMOS_ENDPOINT` to the restored account’s endpoint.
2. Rotate connection keys in Key Vault and redeploy LMS API.
3. Run sanity checks (health, readiness, course list) before user-facing restore.

## Static Web App (SWA)

Static content is rebuilt from the repo on every release. No backups required beyond your VCS.

## Certificates / Blob storage

If certificate storage is configured to Blob:
```bash
az storage blob list -c <container> --account-name <storage> --prefix certificates/
```
Enable soft-delete and versioning on the container for rollbacks.

## Testing the Plan

- Quarterly: restore Cosmos to a staging account and point the staging LMS API to it; run smoke tests.
- Document timings and any manual steps needed to streamline future recovery.

