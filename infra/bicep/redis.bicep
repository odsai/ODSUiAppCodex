@description('Azure location, e.g. eastus')
param location string

@description('Redis cache name (lowercase, alphanumeric, hyphen)')
param name string

@description('SKU family (C = Basic/Standard, P = Premium)')
@allowed([ 'C' 'P' ])
param family string = 'C'

@description('SKU capacity (0-6 for C family)')
param capacity int = 1

@description('SKU name (Basic, Standard, Premium)')
@allowed([ 'Basic' 'Standard' 'Premium' ])
param skuName string = 'Standard'

@description('Enable TLS 1.2 only')
param minimumTlsVersion string = '1.2'

resource cache 'Microsoft.Cache/redis@2023-08-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: skuName
      family: family
      capacity: capacity
    }
    enableNonSslPort: false
    minimumTlsVersion: minimumTlsVersion
  }
  tags: {
    'managed-by': 'infra/bicep/redis.bicep'
  }
}

output hostname string = cache.properties.hostName
output port int = cache.properties.sslPort
