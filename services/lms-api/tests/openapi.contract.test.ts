import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { createApp } from '../src/server/app'

let app: Awaited<ReturnType<typeof createApp>>

beforeAll(async () => {
  process.env.AUTH_DEV_ALLOW = '1'
  delete process.env.OWUI_BASE_URL
  app = await createApp()
})

afterAll(async () => {
  await app.close()
})

describe('OpenAPI contract (basic path coverage)', () => {
  const specPath = path.resolve(process.cwd(), '../../LMS/API-SCHEMA.md')
  const raw = fs.readFileSync(specPath, 'utf8')
  const doc = yaml.load(raw) as any

  it('spec has required paths', () => {
    const p = doc.paths
    expect(p['/courses']).toBeTruthy()
    expect(p['/courses/{courseId}']).toBeTruthy()
    expect(p['/courses/{courseId}/progress']).toBeTruthy()
    expect(p['/courses/{courseId}/lessons/{lessonId}/tutor']).toBeTruthy()
  })

  it('GET /courses responds 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/courses', headers: { authorization: 'Bearer dev', 'x-tenant-id': 'mock-tenant' } })
    expect(res.statusCode).toBe(200)
  })

  it('GET /courses/{courseId} responds 200 for sample', async () => {
    const res = await app.inject({ method: 'GET', url: '/courses/course-odsai-sample', headers: { authorization: 'Bearer dev', 'x-tenant-id': 'mock-tenant' } })
    expect(res.statusCode).toBe(200)
  })

  it('GET /courses/{courseId}/progress responds 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/courses/course-odsai-sample/progress', headers: { authorization: 'Bearer dev', 'x-tenant-id': 'mock-tenant' } })
    expect(res.statusCode).toBe(200)
  })

  it('POST /courses/{courseId}/progress responds 202', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/progress',
      headers: { authorization: 'Bearer dev', 'x-tenant-id': 'mock-tenant', 'content-type': 'application/json' },
      payload: { lessonId: 'm1l1', status: 'in-progress' },
    })
    expect(res.statusCode).toBe(202)
  })

  it('POST /courses/{courseId}/lessons/{lessonId}/tutor returns 503 without OWUI', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/lessons/m1l1/tutor',
      headers: { authorization: 'Bearer dev', 'x-tenant-id': 'mock-tenant', 'content-type': 'application/json' },
      payload: { prompt: 'hi' },
    })
    expect([503]).toContain(res.statusCode)
  })
})

