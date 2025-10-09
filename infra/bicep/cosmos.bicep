@description('Azure location, e.g. eastus')
param location string

@description('Cosmos DB account name (must be globally unique)')
param accountName string

@description('SQL database name')
param dbName string = 'odsui-lms'

@description('Containers to create with partition keys')
param containers array = [
  { name: 'courses', partitionKey: '/tenantId' },
  { name: 'progress', partitionKey: '/tenantId' },
  { name: 'workspaceSettings', partitionKey: '/tenantId' }
]

resource account 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: accountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    publicNetworkAccess: 'Enabled'
    enableFreeTier: false
    disableKeyBasedMetadataWriteAccess: false
  }
}

resource sqlDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  name: '${account.name}/${dbName}'
  properties: {
    resource: { id: dbName }
    options: {}
  }
}

resource sqlContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = [for c in containers: {
  name: '${account.name}/${sqlDb.name}/${c.name}'
  properties: {
    resource: {
      id: c.name
      partitionKey: {
        paths: [ c.partitionKey ]
        kind: 'Hash'
      }
    }
    options: {}
  }
}]

output cosmosEndpoint string = account.properties.documentEndpoint
