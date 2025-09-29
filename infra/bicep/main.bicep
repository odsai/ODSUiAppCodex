@description('Azure location, e.g. eastus')
param location string

@description('Resource name prefix, e.g. odsui-lms-dev')
param prefix string

@description('Container App name')
param containerAppName string

@description('Container image to deploy (e.g. myregistry.azurecr.io/odsui-lms-api:sha)')
param containerImage string

@description('Enable external ingress for dev')
@allowed([ true false ])
param externalIngress bool = true

@description('Min/Max replicas')
param minReplicas int = 1
param maxReplicas int = 2

var laName = '${prefix}-la'
var envName = '${prefix}-cae'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: laName
  location: location
  properties: {
    retentionInDays: 30
    features: {
      searchVersion: 1
    }
  }
}

resource managedEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: managedEnv.id
    configuration: {
      ingress: {
        external: externalIngress
        targetPort: 8080
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'api'
          image: containerImage
          env: [
            {
              name: 'PORT'
              value: '8080'
            }
            {
              name: 'AUTH_DEV_ALLOW'
              value: '0'
            }
          ]
          resources: {
            cpu: 0.5
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output containerAppFqdn string = app.properties.configuration.ingress.fqdn
