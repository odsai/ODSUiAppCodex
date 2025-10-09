import type { AppSettings } from '../store/appStore'
import { buildApiHeaders } from './apiHeaders'

type SettingsResponse = {
  settings: AppSettings
  version: number | null
}

const parseEtag = (value: string | null): number | null => {
  if (!value) return null
  const stripped = value.replace(/"/g, '').trim()
  const parsed = Number(stripped)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/?$/, '')

export async function fetchWorkspaceSettings(opts: {
  baseUrl: string
  token?: string | null
  tenantId: string
}): Promise<SettingsResponse> {
  const { baseUrl, token, tenantId } = opts
  const url = `${normalizeBaseUrl(baseUrl)}/workspace/settings`
  const headers = buildApiHeaders(token, tenantId)
  headers.Accept = 'application/json'
  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load workspace settings (${res.status})`)
  }
  const version = parseEtag(res.headers.get('etag'))
  const settings = (await res.json()) as AppSettings
  return { settings, version }
}

export async function saveWorkspaceSettings(opts: {
  baseUrl: string
  token?: string | null
  tenantId: string
  settings: AppSettings
  version?: number | null
}): Promise<SettingsResponse> {
  const { baseUrl, token, tenantId, settings, version } = opts
  const url = `${normalizeBaseUrl(baseUrl)}/workspace/settings`
  const headers = buildApiHeaders(token, tenantId)
  headers.Accept = 'application/json'
  headers['Content-Type'] = 'application/json'
  if (version !== undefined && version !== null) headers['If-Match'] = `"${version}"`
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(settings) })
  if (!res.ok) {
    if (res.status === 412) throw new Error('VERSION_CONFLICT')
    throw new Error(`Failed to save workspace settings (${res.status})`)
  }
  const nextVersion = parseEtag(res.headers.get('etag'))
  const updated = (await res.json()) as AppSettings
  return { settings: updated, version: nextVersion }
}
