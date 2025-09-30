import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createApp } from '../src/server/app'

const headers = {
  authorization: 'Bearer dev-token',
  'x-tenant-id': 'mock-tenant',
}

let app: Awaited<ReturnType<typeof createApp>>

beforeAll(async () => {
  process.env.AUTH_DEV_ALLOW = '1'
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ods-cert-'))
  process.env.CERT_STORAGE_DIR = tmp
  delete process.env.OWUI_BASE_URL // ensure tutor returns 503 in tests
  app = await createApp()
})

afterAll(async () => {
  await app.close()
})

describe('courses routes', () => {
  it('health requires auth but returns ok with dev token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health', headers })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
  })

  it('lists courses', async () => {
    const res = await app.inject({ method: 'GET', url: '/courses', headers })
    expect(res.statusCode).toBe(200)
    const list = res.json()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
  })

  it('gets course detail', async () => {
    const res = await app.inject({ method: 'GET', url: '/courses/course-odsai-sample', headers })
    expect(res.statusCode).toBe(200)
    const course = res.json()
    expect(course.id).toBe('course-odsai-sample')
  })

  it('tutor returns 503 when OWUI is not configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/lessons/m1l1/tutor',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: { prompt: 'hello' },
    })
    expect(res.statusCode).toBe(503)
  })

  it('upserts progress and returns 202', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/progress',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: {
        userId: 'u1',
        courseId: 'IGNORED',
        lessonId: 'm1l1',
        status: 'in-progress',
      },
    })
    expect(res.statusCode).toBe(202)
  })

  it('exposes metrics snapshot', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics', headers })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json).toHaveProperty('tutor_success_total')
    expect(json).toHaveProperty('tutor_failure_total')
  })

  it('stores certificate pdf when storage configured', async () => {
    await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/progress',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: { lessonId: 'm1l1', status: 'completed' },
    })
    await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/progress',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: { lessonId: 'm1l2', status: 'completed' },
    })
    await app.inject({
      method: 'POST',
      url: '/courses/course-odsai-sample/progress',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: { lessonId: 'm2q1', status: 'completed', score: 1 },
    })
    const res = await app.inject({ method: 'GET', url: '/courses/course-odsai-sample/certificate/pdf', headers })
    expect(res.statusCode).toBe(200)
    const storageDir = process.env.CERT_STORAGE_DIR!
    const expected = path.join(storageDir, 'mock-tenant', 'course-odsai-sample', 'dev-user.pdf')
    expect(fs.existsSync(expected)).toBe(true)
  })
})
