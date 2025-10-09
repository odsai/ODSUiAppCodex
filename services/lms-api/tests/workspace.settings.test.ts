import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { createApp } from '../src/server/app'
import { createDefaultAppSettings } from '../src/domain/appSettings'

const headers = {
  authorization: 'Bearer dev-admin',
  'x-tenant-id': 'mock-tenant',
}

describe('workspace settings routes', () => {
  let app: FastifyInstance
  let currentEtag = '"0"'

  beforeAll(async () => {
    process.env.AUTH_DEV_ALLOW = '1'
    process.env.DATA_BACKEND = ''
    const workDir = path.resolve(process.cwd(), '.tmp-workspace-settings.json')
    if (fs.existsSync(workDir)) fs.unlinkSync(workDir)
    process.env.WORKSPACE_SETTINGS_PATH = workDir
    app = await createApp()
    await app.ready()
  })

  afterAll(async () => {
    if (process.env.WORKSPACE_SETTINGS_PATH && fs.existsSync(process.env.WORKSPACE_SETTINGS_PATH)) {
      fs.unlinkSync(process.env.WORKSPACE_SETTINGS_PATH)
    }
    await app.close()
  })

  it('returns default settings and ETag', async () => {
    const res = await app.inject({ method: 'GET', url: '/workspace/settings', headers })
    expect(res.statusCode).toBe(200)
    expect(res.headers.etag).toBeTruthy()
    currentEtag = res.headers.etag ?? currentEtag
    const payload = res.json()
    const defaults = createDefaultAppSettings()
    expect(payload.appearance.theme).toBe(defaults.appearance.theme)
  })

  it('saves settings with optimistic concurrency', async () => {
    const first = await app.inject({
      method: 'PUT',
      url: '/workspace/settings',
      headers: { ...headers, 'if-match': currentEtag, 'content-type': 'application/json' },
      payload: {
        apps: [
          { id: 'app-penpot', label: 'Penpot', icon: 'FiPenTool', url: 'https://penpot.example.com', enabled: true },
        ],
        appearance: { theme: 'light', brandColor: '#FF6F00', title: 'Studio', intro: 'Intro', introAlignment: 'center', palettes: [] },
        courses: { allowSelfEnroll: true },
        lms: { enabled: false, autoEnrollNewUsers: false, features: {}, recentCoursesLimit: 6 },
        auth: { provider: 'azure-ad', enabled: false, tenantId: '', authority: '', clientId: '', redirectUri: '', postLogoutRedirectUri: '', scopes: [] },
        updatedAt: new Date().toISOString(),
      },
    })
    expect(first.statusCode).toBe(200)
    expect(first.headers.etag).toBeTruthy()
    const staleEtag = currentEtag
    currentEtag = first.headers.etag ?? currentEtag

    const conflict = await app.inject({
      method: 'PUT',
      url: '/workspace/settings',
      headers: { ...headers, 'if-match': staleEtag, 'content-type': 'application/json' },
      payload: {
        apps: [],
        appearance: { theme: 'dark', brandColor: '#000000', title: 'Conflict', intro: 'Conflict', introAlignment: 'center', palettes: [] },
        courses: { allowSelfEnroll: false },
        lms: { enabled: false, autoEnrollNewUsers: false, features: {}, recentCoursesLimit: 6 },
        auth: { provider: 'azure-ad', enabled: false, tenantId: '', authority: '', clientId: '', redirectUri: '', postLogoutRedirectUri: '', scopes: [] },
        updatedAt: new Date().toISOString(),
      },
    })
    expect(conflict.statusCode).toBe(412)
  })
})
