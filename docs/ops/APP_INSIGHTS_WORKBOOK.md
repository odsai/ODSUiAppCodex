# Application Insights Workbook Template

This guide provides a starter workbook for monitoring the ODSUi shell and LMS API using Azure Application Insights. Import the JSON below into the Azure portal to create a baseline dashboard with request volume, latency, failures, and custom events.

## Instructions
1. Navigate to **Application Insights** → **Workbooks** → **New**.
2. Select **Advanced editor** → **Gallery template**.
3. Paste the JSON from the _Workbook JSON_ section below and save (e.g., `ODSUi - Baseline Observability`).
4. Update the resource dropdowns to point to your production App Insights instance.
5. Set workbook access permissions for your operations team.

### Recommended alert thresholds
- **Request failures**: ≥ 5 failures in 5 minutes (already provided in Bicep alert module).
- **Request duration**: ≥ 1500 ms average in 5 minutes.
- **Readiness probe failures**: configure ACA alert for `/ready` returning non-200.
- **Client-side telemetry**: monitor `browserTimings/duration` (p95) and custom events `header.toggle`, `search.submit` once instrumented.

## Workbook JSON
```json
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests | summarize count() by bin(timestamp, 5m)",
        "size": 0,
        "exportToExcelOptions": "visible"
      },
      "name": "RequestVolume"
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests | summarize avg(duration) by bin(timestamp, 5m)",
        "size": 0
      },
      "name": "RequestDuration"
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests | where success == false | summarize count() by bin(timestamp, 5m)",
        "size": 0
      },
      "name": "Failures"
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "dependencies | summarize avg(duration) by bin(timestamp, 5m)",
        "size": 0
      },
      "name": "Dependencies"
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "customEvents | where name has 'header' or name has 'search' | summarize count() by name, bin(timestamp, 1h)",
        "size": 0
      },
      "name": "CustomEvents"
    }
  ],
  "fallbackResourceIds": [
    "resource id placeholder"
  ]
}
```

> Tip: Duplicate the workbook for staging vs production and adjust the data granularity to match your SLA windows.
