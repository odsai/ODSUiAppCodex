import { ApplicationInsights, ITelemetryItem } from '@microsoft/applicationinsights-web'

let instance: ApplicationInsights | null = null

const sanitizeTelemetryItem = (item: ITelemetryItem) => {
  if (!item.tags) return
  const piiKeys = [
    'ai.user.accountId',
    'ai.user.authUserId',
    'ai.user.id',
    'ai.session.id',
  ]
  piiKeys.forEach((key) => {
    if (key in item.tags!) delete item.tags[key]
  })
}

export const initAppInsights = () => {
  if (instance || typeof window === 'undefined') return

  const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING
  const instrumentationKey = import.meta.env.VITE_APPINSIGHTS_INSTRUMENTATION_KEY

  const config = connectionString
    ? { connectionString }
    : instrumentationKey
      ? { instrumentationKey }
      : null

  if (!config) return

  instance = new ApplicationInsights({
    config: {
      ...config,
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
      disableAjaxTracking: false,
      autoTrackPageVisitTime: true,
      disableCorrelationHeaders: false,
      samplingPercentage: 75,
      extensionConfig: {},
      enableRequestHeaderTracking: false,
      enableResponseHeaderTracking: false,
      addRequestContext(): Record<string, unknown> {
        return {
          route: window.location.hash || '/',
        }
      },
    },
  })

  instance.loadAppInsights()
  instance.addTelemetryInitializer(sanitizeTelemetryItem)
  instance.trackPageView()
}

export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  instance?.trackEvent({ name }, properties)
}
