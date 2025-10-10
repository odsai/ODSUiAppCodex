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
      'pin',
    ])
    expect(result.header?.hideOnAppIds).toEqual(['app-1', 'app-2'])
    expect(result.header?.menuItems).toHaveLength(1)
    expect(result.header?.railHeight).toBe(4)
    expect(result.header?.shadowOpacity).toBe(0.3)
    expect(result.header?.collapsedOpacity).toBe(0)
    expect(result.header?.minWidth).toBe(280)
    expect(result.header?.maxWidth).toBe(300)
    expect(result.header?.horizontalPadding).toBe(18)
    expect(result.header?.itemGap).toBe(10)
    expect(result.header?.iconScale).toBe(1)
    expect(result.header?.logoDataUrl).toBe('data:image/png;base64,abc123')
  })

  it('respects defaults when header missing', () => {
    const result = normalizeAppSettings({})
    expect(result.header?.sectionOrder).toEqual(['logo', 'apps', 'site', 'search', 'auth', 'pin'])
    expect(result.header?.menuItems).toEqual([])
    expect(result.header?.minWidth).toBe(340)
    expect(result.header?.maxWidth).toBeGreaterThan(result.header?.minWidth ?? 0)
    expect(result.header?.horizontalPadding).toBe(18)
  })

  it('appends pin when autoHide true but legacy section order missing it', () => {
    const result = normalizeAppSettings({
      header: {
        autoHide: true,
        sectionOrder: ['logo', 'apps', 'site', 'search', 'auth'],
      },
    })
    expect(result.header?.sectionOrder).toEqual(['logo', 'apps', 'site', 'search', 'auth', 'pin'])
  })

  it('keeps pin absent when autoHide disabled', () => {
    const result = normalizeAppSettings({
      header: {
        autoHide: false,
        sectionOrder: ['logo', 'apps', 'site', 'search', 'auth'],
      },
    })
    expect(result.header?.sectionOrder).toEqual(['logo', 'apps', 'site', 'search', 'auth'])
  })

  it('normalizes pill menu values and clamps ranges', () => {
    const input = {
      pillMenu: {
        enabled: false,
        allowDrag: 0,
        defaultPin: 'stuck',
        showDashboard: 0,
        showLms: 0,
        showSettings: null,
        showLogout: '',
        includeApps: true,
        density: 'dense',
        style: 'neon',
        fabSize: 120,
        fabIcon: 'FiZap',
        fabBackground: '#123456',
        fabForeground: '#ffffff',
        stackBackground: '#111111',
        stackBorder: '#222222',
        stackOpacity: 0.2,
        stackBlur: 200,
        tooltipSide: 'up',
        menuScale: 5,
        panelPadding: -5,
      },
    }

    const result = normalizeAppSettings(input)
    expect(result.pillMenu.enabled).toBe(false)
    expect(result.pillMenu.allowDrag).toBe(false)
    expect(result.pillMenu.defaultPin).toBe('auto')
    expect(result.pillMenu.showDashboard).toBe(false)
    expect(result.pillMenu.showLms).toBe(false)
    expect(result.pillMenu.showSettings).toBe(false)
    expect(result.pillMenu.showLogout).toBe(false)
    expect(result.pillMenu.includeApps).toBe(true)
    expect(result.pillMenu.density).toBe('comfortable')
    expect(result.pillMenu.style).toBe('glass')
    expect(result.pillMenu.fabSize).toBe(80)
    expect(result.pillMenu.fabIcon).toBe('FiZap')
    expect(result.pillMenu.fabBackground).toBe('#123456')
    expect(result.pillMenu.fabForeground).toBe('#ffffff')
    expect(result.pillMenu.stackBackground).toBe('#111111')
    expect(result.pillMenu.stackBorder).toBe('#222222')
    expect(result.pillMenu.stackOpacity).toBeCloseTo(0.2, 5)
    expect(result.pillMenu.stackBlur).toBe(32)
    expect(result.pillMenu.tooltipSide).toBe('auto')
    expect(result.pillMenu.menuScale).toBeCloseTo(1.4)
    expect(result.pillMenu.panelPadding).toBe(4)
  })
})
