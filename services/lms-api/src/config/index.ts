export type OwuiConfig = {
  baseUrl: string
  apiKey?: string
}

export function getOwuiConfig(): OwuiConfig {
  const baseUrl = process.env.OWUI_BASE_URL ?? ''
  if (!baseUrl) {
    throw new Error('OWUI_BASE_URL not configured')
  }
  const apiKey = process.env.OWUI_API_KEY
  return { baseUrl, apiKey }
}
