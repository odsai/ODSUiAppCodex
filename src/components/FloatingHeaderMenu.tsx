// Floating horizontal menu aligned to top edge
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiLogOut, FiMapPin } from 'react-icons/fi'
import type { Route, PillMenuSettings } from '../store/appStore'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import { resolveIcon } from '../utils/iconCatalog'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/65'

export default function FloatingHeaderMenu({ setRoute, onDashboard }: { setRoute: (r: Route) => void; onDashboard: () => void }) {
  // const currentRoute = useAppStore((s) => s.route)
  const user = useAppStore((s) => s.user)
  const isAdmin = !!user?.roles?.includes('admin')
  const appSettings = useAppStore((s) => s.appSettings)
  const logout = useAppStore((s) => s.logout)
  const previewFloating = useAppStore((s) => s.preview?.floatingHeader)

  const fh = React.useMemo(() => {
    const fallback: PillMenuSettings = {
      enabled: false,
      allowDrag: true,
      defaultPin: 'open' as const,
      showDashboard: true,
      showLms: true,
      showSettings: true,
      showLogout: true,
      includeApps: true,
      density: 'comfortable' as const,
      style: 'glass' as const,
      fabIcon: 'FiGrid',
      fabSize: 48,
      fabBackground: 'var(--brand-color)',
      fabForeground: '#FFFFFF',
      stackBackground: 'rgba(255,255,255,0.85)',
      stackBorder: 'rgba(148, 163, 184, 0.35)',
      stackOpacity: 0.92,
      stackBlur: 12,
      tooltipSide: 'auto' as const,
      menuScale: 1,
      panelPadding: 10,
    }
    const base = { ...fallback, ...(appSettings.floatingHeader ?? {}) }
    if (!previewFloating) return base
    return { ...base, ...(previewFloating as Partial<PillMenuSettings>) }
  }, [appSettings.floatingHeader, previewFloating])

  const lmsEnabled = !!appSettings?.lms?.enabled

  // Mode & hover
  const [mode, setMode] = useState<'auto' | 'open' | 'closed'>(() => fh.defaultPin)
  const [hovering, setHovering] = useState(false)
  const hoverTimeout = useRef<number | null>(null)
  const modeRef = useRef(mode)

  // Positioning: top edge only; drag horizontally
  const xRef = useRef(40)
  const x = xRef.current
  const drag = useRef(false)
  const start = useRef({ x: 0 })
  const off = useRef({ x: 0 })
  const rafId = useRef<number | null>(null)
  const moved = useRef(false)
  const barRef = useRef<HTMLDivElement | null>(null)
  const hotRef = useRef<HTMLDivElement | null>(null)
  const [barWidth, setBarWidth] = useState(0)

  const scale = Math.min(1.4, Math.max(0.6, fh.menuScale ?? 1))
  const FAB = Math.round(Math.max(40, Math.min(72, (fh.fabSize || 48) * scale)))
  const PADDING = Math.max(6, Math.round((fh.panelPadding ?? 10) * scale))
  const GAP = Math.max(6, Math.round((fh.density === 'compact' ? 8 : 12) * scale))
  const ITEM = Math.round(FAB - PADDING * 2)
  const SEARCH_WIDTH = Math.max(220, ITEM * 2)
  // Edge-reveal + vertical offset helpers
  const HOTSPOT = 10
  const RAIL = 4
  const BAR_H = ITEM + PADDING * 2
  const getTy = () => (modeRef.current === 'open' || (modeRef.current !== 'closed' && hovering) ? 8 : -(BAR_H - RAIL))

  useEffect(() => {
    if (hoverTimeout.current) {
      window.clearTimeout(hoverTimeout.current)
      hoverTimeout.current = null
    }
    return () => {
      if (hoverTimeout.current) {
        window.clearTimeout(hoverTimeout.current)
        hoverTimeout.current = null
      }
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  // Track bar width for precise edge hotspot width
  useEffect(() => {
    if (!barRef.current) return
    const el = barRef.current
    const measure = () => setBarWidth(Math.max(0, el.offsetWidth))
    measure()
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure())
      ro.observe(el)
    } else {
      const id = window.setInterval(measure, 300)
      return () => window.clearInterval(id)
    }
    return () => {
      ro?.disconnect()
    }
  }, [])

  const setHoverState = useCallback((v: boolean) => {
    if (hoverTimeout.current) {
      window.clearTimeout(hoverTimeout.current)
      hoverTimeout.current = null
    }
    const m = modeRef.current
    if (v) {
      if (m === 'closed') return
      setHovering(true)
    } else {
      if (m === 'open') return
      hoverTimeout.current = window.setTimeout(() => {
        setHovering(false)
        hoverTimeout.current = null
      }, 120)
    }
  }, [])

  useEffect(() => {
    modeRef.current = mode
    if (mode === 'open') setHovering(true)
    if (mode === 'closed') setHovering(false)
  }, [mode])

  const items = useMemo(() => {
    const out: Array<{
      type: 'builtin' | 'app' | 'logout'
      key: string
      label: string
      icon: React.ReactNode
      action: () => void
    }> = []
    if (fh.showDashboard) out.push({ type: 'builtin', key: 'dashboard', label: 'Dashboard', icon: resolveIcon('FiHome', 18), action: () => { onDashboard(); setRoute('/dashboard') } })
    if (fh.showLms && lmsEnabled) out.push({ type: 'builtin', key: 'lms', label: 'Learning', icon: resolveIcon('FiBook', 18), action: () => setRoute('/lms/dashboard') })
    if (fh.showSettings && isAdmin) out.push({ type: 'builtin', key: 'settings', label: 'Settings', icon: resolveIcon('FiSettings', 18), action: () => setRoute('/settings') })
    if (fh.includeApps) {
      const list = (appSettings.apps || []).filter((a) => a.enabled && (!a.adminOnly || isAdmin))
      list.forEach((app) => {
        const iconNode = app.iconImage ? (
          <img src={app.iconImage} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
        ) : (
          resolveIcon(app.icon)
        )
        out.push({ type: 'app', key: app.id, label: app.label, icon: iconNode, action: () => { if (app.url) { window.location.hash = `/app?id=${encodeURIComponent(app.id)}` } else { toast.error('No link configured. Edit in Settings → Apps.') } } })
      })
    }
    if (fh.showLogout) out.push({ type: 'logout', key: 'logout', label: 'Logout', icon: <FiLogOut size={18} />, action: () => { if (confirm('Log out?')) { logout(); toast.info('Logged out'); setRoute('/dashboard'); setHoverState(false) } } })
    return out
  }, [fh, lmsEnabled, isAdmin, appSettings.apps, onDashboard, setRoute, logout, setHoverState])

  const effective = mode === 'open' || (mode !== 'closed' && hovering)

  // Search
  const [query, setQuery] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const triggerSearch = useCallback(() => {
    const q = query.trim()
    if (!q) return
    window.open(`https://opendesignschool.ai/?s=${encodeURIComponent(q)}`,'_blank','noopener,noreferrer')
  }, [query])
  const searchEntries = useMemo(() => {
    const list: Array<{ key: string; label: string; action: () => void }> = []
    list.push({ key: 'route:/dashboard', label: 'Dashboard', action: () => setRoute('/dashboard') })
    if (lmsEnabled) list.push({ key: 'route:/lms/dashboard', label: 'Learning', action: () => setRoute('/lms/dashboard') })
    list.push({ key: 'route:/settings', label: 'Settings', action: () => setRoute('/settings') })
    ;(appSettings.apps || []).filter((a) => a.enabled).forEach((a) => {
      list.push({ key: `app:${a.id}`, label: a.label, action: () => { if (a.id) window.location.hash = `/app?id=${encodeURIComponent(a.id)}` } })
    })
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 8)
    return list.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 10)
  }, [appSettings.apps, lmsEnabled, query, setRoute])

  const onDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!fh.allowDrag) return
    drag.current = true
    moved.current = false
    start.current = { x: e.clientX }
    off.current = { x: e.clientX - xRef.current }
    const onMove = (ev: MouseEvent) => {
      if (!drag.current) return
      if (Math.abs(ev.clientX - start.current.x) > 4) moved.current = true
      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const pad = 8
        const maxX = Math.max(pad, window.innerWidth - FAB - pad)
        const nx = Math.min(Math.max(ev.clientX - off.current.x, pad), maxX)
        if (barRef.current) {
          const ty = getTy()
          barRef.current.style.transform = `translate3d(${nx}px, ${ty}px, 0)`
        }
        if (hotRef.current) {
          hotRef.current.style.transform = `translate3d(${nx}px, 0, 0)`
        }
        xRef.current = nx
        rafId.current = null
      })
    }
    const onUp = () => {
      drag.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [fh.allowDrag, FAB, getTy])

  // Removed separate FAB; menu bar is the single body now.

  // Compute current translateY for render
  const ty = getTy()

  return fh.enabled ? (
    <>
      {/* Top-edge hotspot for auto reveal */}
      <div
        ref={hotRef}
        className="fixed top-0 z-40 opacity-0"
        style={{ height: HOTSPOT, width: barWidth || 0, left: 0, transform: `translate3d(${x}px, 0, 0)` }}
        onMouseEnter={() => setHoverState(true)}
        aria-hidden
      />
      <div
        className="fixed z-50 select-none"
        ref={barRef}
        style={{ left: 0, top: 0, transform: `translate3d(${x}px, ${ty}px, 0)`, transition: drag.current ? 'none' : 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform', touchAction: 'none' }}
        onMouseEnter={() => setHoverState(true)}
        onMouseLeave={() => setHoverState(false)}
      >
        <div
          className="rounded-3xl border"
          onMouseDown={onDown as unknown as React.MouseEventHandler<HTMLDivElement>}
          style={{
            position: 'relative',
            padding: `${PADDING}px`,
            background: fh.stackBackground,
            borderColor: fh.stackBorder,
            boxShadow: fh.style === 'dark' ? '0 24px 52px rgba(2,6,23,0.5)' : '0 24px 50px rgba(15,23,42,0.25)',
            backdropFilter: fh.style === 'glass' && fh.stackBlur ? `blur(${fh.stackBlur}px)` : undefined,
            WebkitBackdropFilter: fh.style === 'glass' && fh.stackBlur ? `blur(${fh.stackBlur}px)` : undefined,
          }}
        >
          {/* Orange rail visible when hidden */}
          {!effective && (
            <div
              className="absolute left-0 right-0"
              style={{ height: RAIL, bottom: 0, background: 'var(--brand-color)', borderBottomLeftRadius: 999, borderBottomRightRadius: 999 }}
            />
          )}
          <div className="flex items-center" style={{ gap: GAP, opacity: effective ? 1 : 0, pointerEvents: effective ? 'auto' : 'none', transition: 'opacity 160ms ease' }} role="menu" aria-orientation="horizontal">
              {/* Search box */}
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (focusedIdx >= 0 && focusedIdx < searchEntries.length) {
                        e.preventDefault()
                        searchEntries[focusedIdx].action()
                      } else {
                        triggerSearch()
                      }
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setFocusedIdx((i) => Math.min(i + 1, searchEntries.length - 1))
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setFocusedIdx((i) => Math.max(i - 1, -1))
                    }
                    if (e.key === 'Escape') setQuery('')
                  }}
                  placeholder="Search site, apps, projects…"
                  className={`rounded-full border bg-white/95 px-3 pr-9 text-sm text-slate-800 placeholder:text-slate-400 ${focusRing}`}
                  style={{ height: ITEM, width: SEARCH_WIDTH }}
                  onFocus={() => setHoverState(true)}
                  aria-label="Search across site and projects"
                />
                <button
                  type="button"
                  onClick={triggerSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-600 hover:text-brand"
                  aria-label="Run search"
                >
                  {resolveIcon('FiSearch', 16)}
                </button>
                {query && (
                  <div
                    className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-auto rounded-2xl border bg-white/95 shadow-xl"
                    style={{ top: ITEM + 6, width: SEARCH_WIDTH }}
                    role="listbox"
                    onMouseEnter={() => setHoverState(true)}
                  >
                    {searchEntries.map((entry, idx) => {
                      const [kind] = entry.key.split(':') as [string]
                      const icon = kind === 'route' ? resolveIcon('FiNavigation', 16) : kind === 'app' ? resolveIcon('FiGrid', 16) : resolveIcon('FiLink', 16)
                      return (
                        <button
                          key={entry.key}
                          role="option"
                          aria-selected={focusedIdx === idx}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${focusedIdx === idx ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                          onClick={entry.action}
                          onMouseEnter={() => setFocusedIdx(idx)}
                        >
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">{icon}</span>
                          <span className="flex-1 truncate">{entry.label}</span>
                        </button>
                      )
                    })}
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                      onClick={triggerSearch}
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">{resolveIcon('FiSearch', 16)}</span>
                      <span className="flex-1 truncate">Search opendesignschool.ai for “{query}”</span>
                    </button>
                  </div>
                )}
              </div>
              {/* Action items */}
              {items.map((item) => (
                <button
                  key={item.key}
                  role="menuitem"
                  aria-label={item.label}
                  className={`flex items-center justify-center rounded-full border text-lg transition-colors duration-200 ${focusRing}`}
                  style={{ width: ITEM, height: ITEM, background: fh.style === 'dark' ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.96)', color: fh.style === 'dark' ? '#E2E8F0' : '#0F172A', borderColor: fh.stackBorder }}
                  onClick={() => { item.action(); if (mode !== 'open') setHoverState(false) }}
                >
                  {item.icon}
                </button>
              ))}
              {/* Integrated pin toggle */}
              <button
                role="menuitem"
                aria-label={mode === 'open' ? 'Unpin' : 'Pin'}
                className={`flex items-center justify-center rounded-full border text-lg transition-colors duration-200 ${focusRing} ${mode === 'open' ? 'border-brand text-brand' : ''}`}
                style={{ width: ITEM, height: ITEM, background: fh.style === 'dark' ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.96)', color: mode === 'open' ? 'var(--brand-color)' : (fh.style === 'dark' ? '#E2E8F0' : '#0F172A'), borderColor: mode === 'open' ? 'var(--brand-color)' : fh.stackBorder }}
                onClick={() => { setMode((prev) => (prev === 'open' ? 'auto' : 'open')); setHoverState(true) }}
                aria-pressed={mode === 'open'}
                title={mode === 'open' ? 'Unpin' : 'Pin'}
              >
                <FiMapPin size={18} />
              </button>
            </div>
        </div>
      </div>
    </>
  ) : null
}
