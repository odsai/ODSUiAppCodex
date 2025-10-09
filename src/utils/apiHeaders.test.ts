import { describe, it, expect } from 'vitest'
import { buildApiHeaders } from './apiHeaders'

describe('buildApiHeaders', () => {
  it('adds tenant and bearer when provided', () => {
    const h = buildApiHeaders('tok', 'tenant-1')
    expect(h['X-Tenant-Id']).toBe('tenant-1')
    expect(h.Authorization).toBe('Bearer tok')
  })

  it('omits optional headers when absent', () => {
    const h = buildApiHeaders()
    expect(h['X-Tenant-Id']).toBeUndefined()
    expect(h.Authorization).toBeUndefined()
  })
})
