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

@description('Deploy Cosmos DB account and containers')
@allowed([ true false ])
param deployCosmos bool = false

@description('Cosmos DB account name (globally unique)')
param cosmosAccountName string = ''

@description('Cosmos SQL DB name')
param cosmosDbName string = 'odsui-lms'

@description('Cosmos containers config')
param cosmosContainers array = [
  { name: 'courses', partitionKey: '/tenantId' },
  { name: 'progress', partitionKey: '/tenantId' },
  { name: 'workspaceSettings', partitionKey: '/tenantId' }
]

@description('Deploy Key Vault')
@allowed([ true false ])
param deployKeyVault bool = false

@description('Key Vault name')
param keyVaultName string = ''

@description('Deploy Redis cache')
@allowed([ true false ])
param deployRedis bool = false

@description('Redis cache name')
param redisName string = ''

@description('Redis SKU family (C/P)')
param redisFamily string = 'C'

@description('Redis SKU name')
param redisSkuName string = 'Standard'

@description('Redis capacity (0-6 for C)')
param redisCapacity int = 1

@description('Deploy metric alerts for App Insights')
@allowed([ true false ])
param deployAlerts bool = false

@description('App Insights component resource ID')
param appInsightsResourceId string = ''

@description('Action group resource IDs for alert notifications')
param alertActionGroupIds array = []

@description('Failed request threshold in 5 min window')
param alertFailureThreshold int = 5

@description('Average duration threshold (ms) in 5 min window')
param alertDurationThreshold int = 1500

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

module kv 'keyvault.bicep' = if (deployKeyVault) {
  name: '${prefix}-kv'
  params: {
    location: location
    name: keyVaultName == '' ? '${prefix}-kv' : keyVaultName
  }
}

module cosmos 'cosmos.bicep' = if (deployCosmos) {
  name: '${prefix}-cosmos'
  params: {
    location: location
    accountName: cosmosAccountName == '' ? '${prefix}-cosmos' : cosmosAccountName
    dbName: cosmosDbName
    containers: cosmosContainers
  }
}

module redis 'redis.bicep' = if (deployRedis) {
  name: '${prefix}-redis'
  params: {
    location: location
    name: redisName == '' ? '${prefix}-redis' : redisName
    family: redisFamily
    skuName: redisSkuName
    capacity: redisCapacity
  }
}

module alerts 'alerts.bicep' = if (deployAlerts) {
  name: '${prefix}-alerts'
  params: {
    prefix: prefix
    appInsightsResourceId: appInsightsResourceId
    actionGroupIds: alertActionGroupIds
    failureThreshold: alertFailureThreshold
    durationThreshold: alertDurationThreshold
  }
}

output keyVaultUri string = deployKeyVault ? kv.outputs.vaultUri : ''
output cosmosEndpoint string = deployCosmos ? cosmos.outputs.cosmosEndpoint : ''
output redisHost string = deployRedis ? redis.outputs.hostname : ''
output redisPort int = deployRedis ? redis.outputs.port : 0
