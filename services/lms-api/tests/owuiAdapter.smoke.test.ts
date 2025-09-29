import { describe, it, expect } from 'vitest'

import { OwuiAdapter } from '../src/clients/owuiAdapter'

const baseUrl = process.env.OWUI_BASE_URL

describe('OwuiAdapter', () => {
  if (!baseUrl) {
    it.skip('skips OWUI smoke tests when OWUI_BASE_URL is not set', () => {})
    return
  }

  it('performs health check', async () => {
    const adapter = new OwuiAdapter()
    const result = await adapter.health()
    expect(result).toBeTruthy()
  })
})
