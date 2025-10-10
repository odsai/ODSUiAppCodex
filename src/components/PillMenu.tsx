// Floating pill menu
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { FiLogOut, FiMapPin } from 'react-icons/fi'
import type { AppConfig, Route, PillMenuSettings } from '../store/appStore'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import { resolveIcon } from '../utils/iconCatalog'

const clampToViewport = (x: number, y: number, w: number, h: number, pad = 8) => {
  const maxX = Math.max(pad, window.innerWidth - w - pad)
  const maxY = Math.max(pad, window.innerHeight - h - pad)
  return { x: Math.min(Math.max(x, pad), maxX), y: Math.min(Math.max(y, pad), maxY) }
}

const hexToRgb = (hex: string): [number, number, number] | null => {
  const value = hex.replace('#', '')
  if (value.length === 3) {
    const r = Number.parseInt(value[0] + value[0], 16)
    const g = Number.parseInt(value[1] + value[1], 16)
    const b = Number.parseInt(value[2] + value[2], 16)
    return [r, g, b]
  }
  if (value.length === 6) {
    const r = Number.parseInt(value.slice(0, 2), 16)
    const g = Number.parseInt(value.slice(2, 4), 16)
    const b = Number.parseInt(value.slice(4, 6), 16)
    return [r, g, b]
  }
  return null
}

const parseRgbString = (input: string): [number, number, number] | null => {
  const match = input.match(/rgb(a)?\(([^)]+)\)/i)
  if (!match) return null
  const parts = match[2].split(',').map((part) => Number.parseFloat(part.trim()))
  if (parts.length < 3 || parts.some((unit) => Number.isNaN(unit))) return null
  return [parts[0], parts[1], parts[2]]
}

const applyOpacity = (color: string | undefined, alpha: number) => {
  const clamped = Math.min(1, Math.max(0, alpha))
  if (!color) return `rgba(255,255,255,${clamped})`
  if (color.startsWith('rgba')) {
    const rgb = parseRgbString(color)
    return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamped})` : color
  }
  if (color.startsWith('rgb(')) {
    const rgb = parseRgbString(color)
    return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamped})` : color
  }
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color)
    return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamped})` : color
  }
  if (color.startsWith('var(')) {
    return color
  }
  return color
}

type MenuItem =
  | {
      type: 'builtin'
      id: 'dashboard' | 'settings' | 'lms'
      label: string
      icon: React.ReactNode
      action: () => void
    }
  | { type: 'app'; config: AppConfig; icon: React.ReactNode }
  | { type: 'logout'; label: string; icon: React.ReactNode }

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/65'

export default function PillMenu({
  setRoute,
  onDashboard,
}: {
  setRoute: (r: Route) => void
  onDashboard: () => void
}) {
  const currentRoute = useAppStore((s) => s.route)
  const user = useAppStore((s) => s.user)
  const isAdmin = !!user?.roles?.includes('admin')
  const appSettings = useAppStore((s) => s.appSettings)
  const logout = useAppStore((s) => s.logout)
  const previewPill = useAppStore((s) => s.preview?.pillMenu)

  const pill = React.useMemo(() => {
    const fallback: PillMenuSettings = {
      enabled: true,
      allowDrag: true,
      defaultPin: 'auto' as const,
      showDashboard: true,
      showLms: true,
      showSettings: true,
      showLogout: true,
      includeApps: true,
      density: 'comfortable' as const,
      style: 'glass' as const,
      fabIcon: 'FiGrid',
      fabSize: 56,
      fabBackground: 'var(--brand-color)',
      fabForeground: '#FFFFFF',
      stackBackground: 'rgba(255,255,255,0.85)',
      stackBorder: 'rgba(148, 163, 184, 0.35)',
      stackOpacity: 0.9,
      stackBlur: 18,
      tooltipSide: 'auto' as const,
      menuScale: 1,
    }
    const base = { ...fallback, ...(appSettings.pillMenu ?? {}) }
    if (!previewPill) return base
    const merged = { ...base }
    Object.entries(previewPill).forEach(([key, value]) => {
      if (value !== undefined) {
        ;(merged as Record<string, unknown>)[key] = value
      }
    })
    return merged
  }, [appSettings.pillMenu, previewPill])
  const lmsEnabled = !!appSettings?.lms?.enabled

  const [mode, setMode] = useState<'auto' | 'open' | 'closed'>(() => {
    if (pill.defaultPin === 'open') return 'open'
    if (pill.defaultPin === 'closed') return 'closed'
    return 'auto'
  })
  const [hovering, setHovering] = useState(false)
  const [pos, setPos] = useState({ x: 40, y: 320 })
  const [isDragging, setIsDragging] = useState(false)
  const [showStack, setShowStack] = useState(false)
  const positionRef = useRef({ x: 40, y: 320 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeExternalId, setActiveExternalId] = useState<string | null>(null)

  const drag = useRef(false)
  const hoverTimeout = useRef<number | null>(null)
  const modeRef = useRef(mode)
  const start = useRef({ x: 0, y: 0 })
  const off = useRef({ x: 0, y: 0 })
  const moved = useRef(false)
  const rafId = useRef<number | null>(null)
  const defaultPinRef = useRef(pill.defaultPin)

  const densityCompact = pill.density === 'compact'
  const scale = Math.min(1.4, Math.max(0.6, pill.menuScale ?? 1))
  const baseFab = Math.max(48, Math.min(80, pill.fabSize || 56))
  const FAB = Math.round(Math.max(40, Math.min(96, baseFab * scale)))
  const GAP = Math.max(4, Math.round((densityCompact ? 8 : 12) * scale))
  const basePadding = pill.panelPadding ?? 12
  const PILLPAD = Math.max(2, Math.round(basePadding * scale))
  const ITEM_SIZE = Math.round(Math.max(24, FAB - Math.max(4, PILLPAD) * 2))
  const PANEL_WIDTH = FAB
  const TH = 5

  useEffect(() => {
    if (defaultPinRef.current === pill.defaultPin) return
    defaultPinRef.current = pill.defaultPin
    setMode(() => {
      if (pill.defaultPin === 'open') return 'open'
      if (pill.defaultPin === 'closed') return 'closed'
      return 'auto'
    })
  }, [pill.defaultPin])

  const setHoverState = useCallback((value: boolean) => {
    if (hoverTimeout.current) {
      window.clearTimeout(hoverTimeout.current)
      hoverTimeout.current = null
    }
    const currentMode = modeRef.current
    if (value) {
      if (currentMode === 'closed') return
      setHovering(true)
    } else {
      if (currentMode === 'open') return
      hoverTimeout.current = window.setTimeout(() => {
        setHovering(false)
        hoverTimeout.current = null
      }, 120)
    }
  }, [])

  const tokens = React.useMemo(() => {
    const clampOpacity = Math.min(1, Math.max(0, pill.stackOpacity ?? 0.9))
    if (pill.style === 'dark') {
      return {
        panelBg: pill.stackBackground || 'rgba(15,23,42,0.92)',
        panelBorder: pill.stackBorder || 'rgba(148,163,184,0.45)',
        itemBg: 'rgba(31,41,55,0.9)',
        itemBorder: 'rgba(148,163,184,0.5)',
        itemColor: '#E2E8F0',
        tooltipBg: 'rgba(226,232,240,0.95)',
        tooltipColor: '#0F172A',
        shadow: '0 24px 52px rgba(2,6,23,0.62)',
        itemShadow: '0 10px 28px rgba(2,6,23,0.55)',
        hoverClass: 'hover:bg-slate-600/70',
      }
    }
    if (pill.style === 'glass') {
      return {
        panelBg: applyOpacity(pill.stackBackground || '#FFFFFF', clampOpacity),
        panelBorder: pill.stackBorder || 'rgba(255,255,255,0.38)',
        itemBg: applyOpacity('#FFFFFF', Math.min(0.98, clampOpacity + 0.05)),
        itemBorder: pill.stackBorder || 'rgba(255,255,255,0.45)',
        itemColor: '#0F172A',
        tooltipBg: 'rgba(15,23,42,0.9)',
        tooltipColor: '#FFFFFF',
        shadow: '0 26px 56px rgba(15,23,42,0.22)',
        itemShadow: '0 12px 26px rgba(15,23,42,0.18)',
        hoverClass: 'hover:bg-white/95',
      }
    }
    return {
      panelBg: pill.stackBackground || 'rgba(255,255,255,0.95)',
      panelBorder: pill.stackBorder || 'rgba(148,163,184,0.28)',
      itemBg: 'rgba(255,255,255,0.97)',
      itemBorder: 'rgba(148,163,184,0.3)',
      itemColor: '#0F172A',
      tooltipBg: 'rgba(15,23,42,0.92)',
      tooltipColor: '#FFFFFF',
      shadow: '0 22px 54px rgba(15,23,42,0.16)',
      itemShadow: '0 10px 24px rgba(15,23,42,0.12)',
      hoverClass: 'hover:bg-slate-50',
    }
  }, [pill.style, pill.stackBackground, pill.stackBorder, pill.stackOpacity])

  const buttonBaseStyle = React.useMemo(
    () => ({
      background: tokens.itemBg,
      color: tokens.itemColor,
      borderColor: tokens.itemBorder,
      boxShadow: tokens.itemShadow,
    }),
    [tokens.itemBg, tokens.itemColor, tokens.itemBorder, tokens.itemShadow],
  )

  const activeButtonStyle = React.useMemo(
    () => ({
      background: pill.fabBackground || 'var(--brand-color)',
      color: pill.fabForeground || '#FFFFFF',
      borderColor: pill.fabBackground || 'var(--brand-color)',
      boxShadow: '0 16px 34px rgba(15,23,42,0.22)',
    }),
    [pill.fabBackground, pill.fabForeground],
  )

  const fabStyle = React.useMemo(
    () => ({
      width: FAB,
      height: FAB,
      background: pill.fabBackground || 'var(--brand-color)',
      color: pill.fabForeground || '#FFFFFF',
      boxShadow:
        pill.style === 'dark'
          ? '0 26px 58px rgba(2,6,23,0.55)'
          : pill.style === 'glass'
          ? '0 24px 54px rgba(15,23,42,0.28)'
          : '0 24px 50px rgba(15,23,42,0.22)',
    }),
    [FAB, pill.fabBackground, pill.fabForeground, pill.style],
  )

  const panelStyle = React.useMemo(() => {
    const blurAmount = Math.max(0, pill.stackBlur ?? 0)
    const applyBlur = pill.style === 'glass' && blurAmount > 0
    return {
      padding: PILLPAD,
      background: tokens.panelBg,
      borderColor: tokens.panelBorder,
      boxShadow: tokens.shadow,
      borderRadius: Math.max(12, Math.round(FAB / 2)),
      backdropFilter: applyBlur ? `blur(${blurAmount}px)` : undefined,
      WebkitBackdropFilter: applyBlur ? `blur(${blurAmount}px)` : undefined,
    }
  }, [FAB, PILLPAD, tokens.panelBg, tokens.panelBorder, tokens.shadow, pill.stackBlur, pill.style])

  const { showDashboard, showLms, showSettings, includeApps, showLogout } = pill

  const resolvedItems: MenuItem[] = React.useMemo(() => {
    const items: MenuItem[] = []
    if (showDashboard) {
      items.push({
        type: 'builtin',
        id: 'dashboard',
        label: 'Dashboard',
        icon: resolveIcon('FiHome', 18),
        action: () => {
          onDashboard()
          setRoute('/dashboard')
        },
      })
    }
    if (showLms && lmsEnabled) {
      items.push({
        type: 'builtin',
        id: 'lms',
        label: 'Learning',
        icon: resolveIcon('FiBook', 18),
        action: () => setRoute('/lms/dashboard'),
      })
    }
    if (showSettings && isAdmin) {
      items.push({
        type: 'builtin',
        id: 'settings',
        label: 'Settings',
        icon: resolveIcon('FiSettings', 18),
        action: () => setRoute('/settings'),
      })
    }
    if (includeApps) {
      const apps = (appSettings.apps || []).filter((app) => app.enabled && (!app.adminOnly || isAdmin))
      apps.forEach((config) => {
        const iconNode = config.iconImage ? (
          <img src={config.iconImage} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
        ) : (
          resolveIcon(config.icon)
        )
        items.push({ type: 'app', config, icon: iconNode })
      })
    }
    if (showLogout) {
      items.push({ type: 'logout', label: 'Logout', icon: <FiLogOut size={18} /> })
    }
    return items
  }, [appSettings.apps, includeApps, isAdmin, lmsEnabled, onDashboard, setRoute, showDashboard, showLms, showLogout, showSettings])

  const stackHeight =
    resolvedItems.length > 0 ? PILLPAD * 2 + resolvedItems.length * ITEM_SIZE + Math.max(0, resolvedItems.length - 1) * GAP : 0

  const PANEL_GAP = Math.max(4, Math.round(8 * scale))
  const openUp =
    typeof window !== 'undefined' && pos.y + FAB + PANEL_GAP + stackHeight > window.innerHeight - 16
  const panelOffset = openUp ? -(stackHeight + PANEL_GAP) : FAB + PANEL_GAP

  const onSideLeft = typeof window !== 'undefined' ? pos.x <= window.innerWidth / 2 : true
  const tooltipPlacement = pill.tooltipSide === 'auto' ? (onSideLeft ? 'right' : 'left') : pill.tooltipSide

  const closedTranslateClass = openUp ? 'translate-y-2' : '-translate-y-2'

  const effective = mode === 'open' || (mode !== 'closed' && hovering)

  useEffect(() => {
    modeRef.current = mode
    if (mode === 'open') setHovering(true)
    if (mode === 'closed') setHovering(false)
  }, [mode])

  useEffect(() => {
    if (effective) {
      setShowStack(true)
      return
    }
    const timer = window.setTimeout(() => setShowStack(false), 180)
    return () => window.clearTimeout(timer)
  }, [effective])

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!drag.current) return
      const nx = e.clientX - off.current.x
      const ny = e.clientY - off.current.y
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > TH) moved.current = true
      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const clamped = clampToViewport(nx, ny, FAB, FAB)
        positionRef.current = clamped
        if (containerRef.current) {
          containerRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`
        }
        rafId.current = null
      })
    },
    [FAB],
  )

  const handleUp = useCallback(() => {
    if (!drag.current) return
    drag.current = false
    setIsDragging(false)
    const clamped = clampToViewport(positionRef.current.x, positionRef.current.y, FAB, FAB)
    positionRef.current = clamped
    setPos(clamped)
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
  }, [FAB, handleMove])

  const onDown = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!pill.allowDrag) return
      drag.current = true
      moved.current = false
      setHoverState(false)
      setIsDragging(true)
      start.current = { x: e.clientX, y: e.clientY }
      off.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    },
    [handleMove, handleUp, pill.allowDrag, pos.x, pos.y, setHoverState],
  )

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      if (rafId.current) cancelAnimationFrame(rafId.current)
      if (hoverTimeout.current) {
        window.clearTimeout(hoverTimeout.current)
        hoverTimeout.current = null
      }
    }
  }, [handleMove, handleUp])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => {
      const raw = (window.location.hash || '').replace(/^#/, '')
      const [pathOnly, query = ''] = raw.split('?')
      if (pathOnly !== '/app') {
        setActiveExternalId(null)
        return
      }
      const params = new URLSearchParams(query)
      setActiveExternalId(params.get('id'))
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const handleFab = () => {
    if (moved.current) {
      moved.current = false
      return
    }
    if (modeRef.current === 'closed') {
      modeRef.current = 'auto'
      setMode('auto')
      setHoverState(true)
      return
    }
    if (!effective) setHoverState(true)
    else setHoverState(false)
  }

  const onKeyFab = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleFab()
    }
  }

  const onKeyItems = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const focusables = Array.from(
      e.currentTarget.querySelectorAll('button[role="menuitem"]') as NodeListOf<HTMLButtonElement>,
    )
    const idx = focusables.findIndex((el) => el === document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = focusables[Math.min(idx + 1, focusables.length - 1)]
      next?.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = focusables[Math.max(idx - 1, 0)]
      prev?.focus()
    }
    if (e.key === 'Escape') {
      ;(e.currentTarget.parentElement?.previousElementSibling as HTMLButtonElement | null)?.focus()
      setHoverState(false)
    }
  }

  const handleLogout = useCallback(() => {
    if (confirm('Are you sure you want to log out?')) {
      logout()
      toast.info('Logged out')
      setRoute('/dashboard')
      modeRef.current = 'auto'
      setMode('auto')
      setHoverState(false)
    }
  }, [logout, setRoute, setHoverState])

  const FabIconNode = React.useMemo(
    () => resolveIcon(pill.fabIcon || 'FiGrid', FAB >= 60 ? 24 : 22),
    [FAB, pill.fabIcon],
  )

  return (
    pill.enabled ? (
    <div
      ref={containerRef}
      className="fixed z-50 select-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`,
        transition: isDragging ? 'none' : 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
        touchAction: 'none',
      }}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
    >
      <button
        type="button"
        className="absolute -top-2 right-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-800"
        style={{ opacity: mode === 'open' || effective ? 1 : 0.35, pointerEvents: 'auto' }}
        onMouseEnter={() => setHoverState(true)}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          setMode((prev) => {
            const next = prev === 'open' ? 'auto' : 'open'
            modeRef.current = next
            if (next === 'open') setHoverState(true)
            else setHoverState(false)
            return next
          })
        }}
        aria-pressed={mode === 'open'}
        aria-label={mode === 'open' ? 'Unpin floating menu' : 'Pin floating menu'}
        title={mode === 'open' ? 'Unpin floating menu' : 'Pin floating menu'}
      >
        <FiMapPin size={12} className={mode === 'open' ? 'text-brand' : 'text-slate-500'} />
      </button>
      {resolvedItems.length > 0 && showStack && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 ease-out ${
            effective ? 'pointer-events-auto opacity-100 translate-y-0' : `pointer-events-none opacity-0 ${closedTranslateClass}`
          }`}
          style={{ top: panelOffset, width: PANEL_WIDTH }}
          aria-hidden={!effective}
          onMouseEnter={() => setHoverState(true)}
          onMouseLeave={() => setHoverState(false)}
        >
          <div className="rounded-3xl border" style={panelStyle}>
            <div
              className="grid"
              style={{ gap: GAP, padding: 0, margin: 0 }}
              role="menu"
              aria-orientation="vertical"
              onKeyDown={onKeyItems}
              aria-hidden={!effective}
            >
              {resolvedItems.map((item) => {
                const key =
                  item.type === 'app'
                    ? item.config.id
                    : item.type === 'builtin'
                    ? `builtin-${item.id}`
                    : 'logout'
                const isActive =
                  (item.type === 'builtin' &&
                    ((item.id === 'dashboard' && currentRoute === '/dashboard') ||
                      (item.id === 'lms' && currentRoute.startsWith('/lms')) ||
                      (item.id === 'settings' && currentRoute === '/settings'))) ||
                  (item.type === 'app' && currentRoute === '/app' && activeExternalId === item.config.id)
                const itemStyle = isActive
                  ? { ...buttonBaseStyle, ...activeButtonStyle, width: ITEM_SIZE, height: ITEM_SIZE }
                  : { ...buttonBaseStyle, width: ITEM_SIZE, height: ITEM_SIZE }
                return (
                  <div key={key} className="group relative grid place-items-center">
                    <button
                      role="menuitem"
                      aria-label={item.type === 'app' ? item.config.label : item.label}
                      tabIndex={effective ? 0 : -1}
                      onClick={() => {
                        if (item.type === 'app') {
                          if (item.config.url) {
                            const id = item.config.id
                            window.location.hash = `/app?id=${encodeURIComponent(id)}`
                            setActiveExternalId(id)
                          } else {
                            toast.error('No link configured. Edit the app in Settings → Apps.')
                          }
                          if (mode !== 'open') setHoverState(false)
                        } else if (item.type === 'builtin') {
                          item.action()
                          setHoverState(false)
                        } else handleLogout()
                      }}
                      className={`flex items-center justify-center rounded-full border text-lg transition-colors duration-200 ${tokens.hoverClass} ${focusRing}`}
                      style={itemStyle}
                    >
                      {item.icon}
                    </button>
                    <span
                      className="pointer-events-none absolute whitespace-nowrap rounded px-2 py-1 text-xs opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: tooltipPlacement === 'right' ? 'calc(100% + 10px)' : undefined,
                        right: tooltipPlacement === 'left' ? 'calc(100% + 10px)' : undefined,
                        background: tokens.tooltipBg,
                        color: tokens.tooltipColor,
                      }}
                    >
                      {item.type === 'app' ? item.config.label : item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <button
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={effective}
        onMouseDown={onDown}
        onClick={handleFab}
        onKeyDown={onKeyFab}
        onMouseEnter={() => setHoverState(true)}
        onFocus={() => setHoverState(true)}
        className={`relative grid place-items-center rounded-full transition-transform duration-200 ${
          pill.allowDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${focusRing}`}
        style={{ ...fabStyle, transform: isDragging ? 'scale(0.94)' : undefined }}
      >
      <span className="grid place-items-center text-current">{FabIconNode}</span>
      </button>
    </div>
    ) : null
  )
}
