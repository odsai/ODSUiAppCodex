import appInsights, { DistributedTracingModes } from 'applicationinsights'

let initialized = false

export const initTelemetry = () => {
  if (initialized) return
  const connectionString = process.env.APPINSIGHTS_CONNECTION_STRING
  if (!connectionString) return

  appInsights
    .setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectConsole(false)
    .setAutoCollectHeartbeat(true)
    .setAutoCollectPreAggregatedMetrics(true)
    .setAutoDependencyCorrelation(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(false)
    .setDistributedTracingMode(DistributedTracingModes.AI)
    .setInternalLogging(false, false)

  appInsights.defaultClient?.context?.keys &&
    (appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'lms-api')

  appInsights.start()
  initialized = true
}
