import { describe, it, expect } from 'vitest'
import { normalizeAppSettings } from '../src/store/appStore'

describe('header settings normalization', () => {
  it('deduplicates section order, allows multiple spacers, clamps values', () => {
    const input = {
      header: {
        sectionOrder: ['logo', 'logo', 'apps', 'spacer', 'apps', 'site', 'spacer', 'spacer', 'search', 'auth', 'settings', 'home', 'spacer'],
        hideOnAppIds: ['app-1', '', 123, 'app-2'],
        menuItems: [
          { id: 'docs', label: 'Docs', icon: 'FiBook', url: 'https://example.com/docs', enabled: true },
          { id: 'bad', label: 'Bad', icon: 42, url: '', enabled: true },
        ],
        railHeight: 2,
        shadowOpacity: 0.5,
        collapsedOpacity: -1,
        minWidth: 10,
        maxWidth: 100,
        logoDataUrl: 'data:image/png;base64,abc123',
      },
    }

    const result = normalizeAppSettings(input)
    expect(result.header?.sectionOrder).toEqual([
      'logo',
      'apps',
      'spacer',
      'site',
      'spacer',
      'spacer',
      'search',
      'auth',
      'settings',
      'home',
      'spacer',
    ])
    expect(result.header?.hideOnAppIds).toEqual(['app-1', 'app-2'])
    expect(result.header?.menuItems).toHaveLength(1)
    expect(result.header?.railHeight).toBe(4)
    expect(result.header?.shadowOpacity).toBe(0.3)
    expect(result.header?.collapsedOpacity).toBe(0)
    expect(result.header?.minWidth).toBe(320)
    expect(result.header?.maxWidth).toBe(600)
    expect(result.header?.logoDataUrl).toBe('data:image/png;base64,abc123')
  })

  it('respects defaults when header missing', () => {
    const result = normalizeAppSettings({})
    expect(result.header?.sectionOrder).toEqual(['logo', 'apps', 'site', 'search', 'auth'])
    expect(result.header?.menuItems).toEqual([])
    expect(result.header?.minWidth).toBe(0)
  })
})
