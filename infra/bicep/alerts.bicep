@description('Alert name prefix')
param prefix string

@description('App Insights component resource ID')
param appInsightsResourceId string

@description('Resource IDs of action groups to notify')
param actionGroupIds array = []

@description('Enable alerts')
@allowed([ true false ])
param enabled bool = true

@description('Failure count threshold within 5 minutes')
param failureThreshold int = 5

@description('Server response time threshold in milliseconds')
param durationThreshold int = 1500

var scopes = [
  appInsightsResourceId
]

var actions = [for id in actionGroupIds: {
  actionGroupId: id
}]

resource failedRequests 'Microsoft.Insights/metricAlerts@2023-10-01-preview' = {
  name: '${prefix}-requests-failed'
  location: 'global'
  properties: {
    description: 'Alerts when App Insights logged requests >= threshold (5m window)'
    severity: 2
    enabled: enabled
    scopes: scopes
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          name: 'FailedRequestCount'
          metricNamespace: 'microsoft.insights/components'
          metricName: 'requests/failed'
          operator: 'GreaterThanOrEqual'
          timeAggregation: 'Count'
          threshold: failureThreshold
        }
      ]
    }
    autoMitigate: true
    actions: actions
  }
}

resource slowRequests 'Microsoft.Insights/metricAlerts@2023-10-01-preview' = {
  name: '${prefix}-requests-duration'
  location: 'global'
  properties: {
    description: 'Alerts when average server response time (5m) exceeds threshold'
    severity: 3
    enabled: enabled
    scopes: scopes
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          name: 'AvgDuration'
          metricNamespace: 'microsoft.insights/components'
          metricName: 'requests/duration'
          operator: 'GreaterThanOrEqual'
          timeAggregation: 'Average'
          threshold: durationThreshold
        }
      ]
    }
    autoMitigate: true
    actions: actions
  }
}
