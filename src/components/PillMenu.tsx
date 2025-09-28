// Floating pill menu
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { FiGrid, FiLogOut } from 'react-icons/fi'
import type { AppConfig, Route } from '../store/appStore'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'
import { resolveIcon } from '../utils/iconCatalog'

const clampToViewport = (x: number, y: number, w: number, h: number, pad = 8) => {
  const maxX = Math.max(pad, window.innerWidth - w - pad)
  const maxY = Math.max(pad, window.innerHeight - h - pad)
  return { x: Math.min(Math.max(x, pad), maxX), y: Math.min(Math.max(y, pad), maxY) }
}

type MenuItem =
  | { type: 'builtin'; id: 'dashboard' | 'settings'; label: string; icon: React.ReactNode; action: () => void }
  | { type: 'app'; config: AppConfig; icon: React.ReactNode }
  | { type: 'logout'; label: string; icon: React.ReactNode }

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

  const [pinMode, setPinMode] = useState<'none' | 'open' | 'closed'>('none')
  const [hovering, setHovering] = useState(false)
  const [pos, setPos] = useState({ x: 40, y: 320 })
  const [isDragging, setIsDragging] = useState(false)
  const [showStack, setShowStack] = useState(false)
  const positionRef = useRef({ x: 40, y: 320 })
  const [activeExternalId, setActiveExternalId] = useState<string | null>(null)

  const drag = useRef(false)
  const start = useRef({ x: 0, y: 0 })
  const off = useRef({ x: 0, y: 0 })
  const moved = useRef(false)

  const FAB = 56
  const PILLW = 64
  const PILLPAD = 8
  const ITEMS = 40
  const GAP = 10
  const TH = 5

  const lmsEnabled = useAppStore((s) => s.appSettings.lms.enabled)

  const resolvedItems: MenuItem[] = React.useMemo(() => {
    const items: MenuItem[] = [
      {
        type: 'builtin',
        id: 'dashboard',
        label: 'Dashboard',
        icon: resolveIcon('FiHome', 18),
        action: () => {
          onDashboard()
          setRoute('/dashboard')
        },
      },
    ]

    if (lmsEnabled) {
      items.push({
        type: 'builtin',
        id: 'lms',
        label: 'Learning',
        icon: resolveIcon('FiBook', 18),
        action: () => setRoute('/lms/dashboard'),
      })
    }

    if (isAdmin) {
      items.push({
        type: 'builtin',
        id: 'settings',
        label: 'Settings',
        icon: resolveIcon('FiSettings', 18),
        action: () => setRoute('/settings'),
      })
    }

    const apps = (appSettings?.apps || []).filter((app) => app.enabled && (!app.adminOnly || isAdmin))
    apps.forEach((config) => {
      const iconNode = config.iconImage ? (
        <img
          src={config.iconImage}
          alt=""
          style={{ width: 18, height: 18, objectFit: 'contain' }}
        />
      ) : (
        resolveIcon(config.icon)
      )
      items.push({ type: 'app', config, icon: iconNode })
    })

    items.push({ type: 'logout', label: 'Logout', icon: <FiLogOut size={18} /> })
    return items
  }, [appSettings?.apps, isAdmin, lmsEnabled, onDashboard, setRoute])

  const stackH = PILLPAD * 2 + resolvedItems.length * ITEMS + (resolvedItems.length - 1) * GAP
  const stackOffset = stackH + 8
  const openH = stackH + FAB + 8

  const openUp = typeof window !== 'undefined' && pos.y + openH > window.innerHeight - 16

  const rafId = useRef<number | null>(null)
  const handleMove = useCallback((e: MouseEvent) => {
    if (!drag.current) return
    const nx = e.clientX - off.current.x
    const ny = e.clientY - off.current.y
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > TH) moved.current = true
    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      const clamped = clampToViewport(nx, ny, FAB, FAB)
      positionRef.current = clamped
      setPos(clamped)
      rafId.current = null
    })
  }, [])

  const handleUp = useCallback(() => {
    if (!drag.current) return
    drag.current = false
    setIsDragging(false)
    setPos((p) => {
      const clamped = clampToViewport(p.x, p.y, FAB, FAB)
      positionRef.current = clamped
      return clamped
    })
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
  }, [handleMove])

  const onDown = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      drag.current = true
      moved.current = false
      setIsDragging(true)
      start.current = { x: e.clientX, y: e.clientY }
      off.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    },
    [handleMove, handleUp, pos.x, pos.y],
  )

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      if (rafId.current) cancelAnimationFrame(rafId.current)
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
    setPinMode((p) => (p === 'none' ? (hovering ? 'open' : 'closed') : p === 'open' ? 'closed' : 'open'))
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
      setPinMode('closed')
    }
  }

  const effective =
    pinMode === 'open' || ((pinMode === 'none' || pinMode === 'closed') && hovering)
  const onSideLeft = typeof window !== 'undefined' ? pos.x <= window.innerWidth / 2 : true
  const closedTranslateClass = openUp ? 'translate-y-2' : '-translate-y-2'

  useEffect(() => {
    if (effective) {
      setShowStack(true)
      return
    }
    const t = window.setTimeout(() => setShowStack(false), 180)
    return () => window.clearTimeout(t)
  }, [effective])

  const handleLogout = useCallback(() => {
    if (confirm('Are you sure you want to log out?')) {
      logout()
      toast.info('Logged out')
      setRoute('/dashboard')
      setPinMode('closed')
    }
  }, [logout, setRoute])

  return (
    <div
      className="fixed z-50 select-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`,
        transition: isDragging ? 'none' : 'transform 120ms ease-out',
        willChange: 'transform',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 overflow-visible rounded-full border bg-white/85 shadow backdrop-blur"
        style={{
          width: PILLW,
          height: effective ? openH : FAB,
          top: openUp && effective ? -stackOffset : 0,
          transition: 'height 200ms ease-out, top 200ms ease-out',
        }}
        aria-hidden={!effective}
      >
        {showStack && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 ease-out ${
              effective ? 'opacity-100 translate-y-0' : `pointer-events-none opacity-0 ${closedTranslateClass}`
            }`}
            style={{
              top: openUp ? undefined : FAB + 8,
              bottom: openUp ? FAB + 8 : undefined,
              padding: PILLPAD,
              width: '100%',
              display: 'grid',
              gap: GAP,
            }}
            role="menu"
            aria-orientation="vertical"
            onKeyDown={onKeyItems}
            aria-hidden={!effective}
          >
            {resolvedItems.map((item) => (
              <div
                key={
                  item.type === 'app'
                    ? item.config.id
                    : item.type === 'builtin'
                    ? `builtin-${item.id}`
                    : 'logout'
                }
                className="group relative grid place-items-center"
              >
                <button
                  role="menuitem"
                  aria-label={
                    item.type === 'app' ? item.config.label : item.type === 'builtin' ? item.label : item.label
                  }
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
                      setPinMode('open')
                    } else if (item.type === 'builtin') {
                      item.action()
                      setPinMode('closed')
                    } else handleLogout()
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand ${
                    (item.type === 'builtin' &&
                      ((item.id === 'dashboard' && currentRoute === '/dashboard') ||
                        (item.id === 'lms' && currentRoute.startsWith('/lms')) ||
                        (item.id === 'settings' && currentRoute === '/settings'))) ||
                    (item.type === 'app' && currentRoute === '/app' && activeExternalId === item.config.id)
                      ? 'border-brand bg-brand text-white'
                      : 'bg-white'
                  }`}
                >
                  {item.icon}
                </button>
                <span
                  className="pointer-events-none absolute whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100"
                  style={{
                    left: onSideLeft ? 'calc(100% + 8px)' : undefined,
                    right: onSideLeft ? undefined : 'calc(100% + 8px)',
                  }}
                >
                  {item.type === 'app' ? item.config.label : item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        aria-label="Open menu"
        onMouseDown={onDown}
        onClick={handleFab}
        onKeyDown={onKeyFab}
        className="relative grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-brand text-white shadow-2xl"
      >
        <FiGrid size={24} />
      </button>
    </div>
  )
}
