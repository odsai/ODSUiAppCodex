# Alerting & Monitoring

This guide enables proactive detection of production incidents using Azure Monitor + Application Insights.

## Prerequisites
- Application Insights resource connected to the SPA + LMS API (see `src/telemetry/appInsights.ts` and `services/lms-api/src/telemetry/appInsights.ts`).
- An Azure Monitor Action Group (email, Teams, PagerDuty, etc.) to receive notifications.

## Deploy baseline alerts (Bicep)
Use the optional module in `infra/bicep/main.bicep` to create metric alerts for request failures and latency spikes.

### Parameters
| Parameter | Description |
|-----------|-------------|
| `deployAlerts` | Set `true` to deploy alert rules. |
| `appInsightsResourceId` | Full resource ID of the Application Insights component. |
| `alertActionGroupIds` | Array of action group resource IDs. |
| `alertFailureThreshold` | Number of failed requests in 5 minutes before triggering (default 5). |
| `alertDurationThreshold` | Average request duration (ms) in 5 minutes before triggering (default 1500). |

### Example deployment
```bash
az deployment group create \
  -g <resource-group> \
  -f infra/bicep/main.bicep \
  -p deployAlerts=true \
     appInsightsResourceId="/subscriptions/<sub>/resourceGroups/<rg>/providers/microsoft.insights/components/<name>" \
     alertActionGroupIds='["/subscriptions/<sub>/resourceGroups/<rg>/providers/microsoft.insights/actionGroups/<action-group>"]'
```

## Additional recommendations
- Add an alert for readiness probe failures (`/ready` → 503) using Container Apps metrics.
- Create an Application Insights workbook showing p50/p95 latency, failure count, and live users.
- Review alert notifications quarterly to ensure contact paths remain valid.

