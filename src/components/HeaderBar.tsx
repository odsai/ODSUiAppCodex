import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore, type Route } from '../store/appStore'
import { toast } from '../store/toastStore'
import { resolveIcon } from '../utils/iconCatalog'
import { useCallback } from 'react'

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export default function HeaderBar() {
  const settings = useAppStore((s) => s.appSettings.header)
  const appearance = useAppStore((s) => s.appSettings.appearance)
  const apps = useAppStore((s) => s.appSettings.apps)
  const setRoute = useAppStore((s) => s.setRoute)
  // const updateSettings = useAppStore((s) => s.updateSettings)
  const currentRoute = useAppStore((s) => s.route)
  const signedIn = useAppStore((s) => s.signedIn)
  const logout = useAppStore((s) => s.logout)
  const lmsEnabled = useAppStore((s) => s.appSettings.lms.enabled)
  const menuItems = useAppStore((s) => s.appSettings.header?.menuItems || [])
  const sectionOrder = useAppStore((s) => s.appSettings.header?.sectionOrder || ['logo','apps','site','search','auth'])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Start collapsed by default (thin rail)
    setOpen(false)
  }, [])

  // Fallback config to avoid undefined access during initial hydration
  const cfg = settings || {
    enabled: false,
    autoHide: false,
    height: 56,
    rounded: 'xl' as const,
    showLogo: true,
    showSearch: true,
    menuFromApps: true,
    compact: true,
    hideOnAppIds: [],
    edgeReveal: true,
  }

  // per-app override: always hidden on certain embedded app IDs
  const parseActiveAppId = () => {
    if (typeof window === 'undefined') return null
    const raw = (window.location.hash || '').replace(/^#/, '')
    const [pathOnly, query = ''] = raw.split('?')
    if (pathOnly !== '/app') return null
    const params = new URLSearchParams(query)
    return params.get('id')
  }
  const activeAppId = parseActiveAppId()
  const hiddenForApp = currentRoute === '/app' && !!activeAppId && cfg.hideOnAppIds.includes(activeAppId)

  const enabled = !!cfg.enabled
  // overlay-only, thin rail expands on hover
  const railHeight = Math.max(4, Math.min(40, (cfg as unknown as { railHeight?: number }).railHeight ?? 10))

  const expandedHeight = Math.max(40, cfg.height || 56)
  const searchWidth = cfg.showSearch ? (cfg.compact ? 192 : 240) : 0
  const appIconCount = apps.filter((a) => a.enabled).slice(0, 6).length
  const siteIconCount = (menuItems || []).filter((m) => m.enabled !== false).length
  const iconSize = cfg.compact ? 28 : 34
  const baseWidth = 420
  const dynamicWidth = baseWidth + (appIconCount + siteIconCount) * iconSize + searchWidth
  const containerWidth = Math.max(420, Math.min(960, dynamicWidth))
  const roundedClass =
    cfg.rounded === 'none'
      ? 'rounded-none'
      : cfg.rounded === 'sm'
      ? 'rounded'
      : cfg.rounded === 'md'
      ? 'rounded-md'
      : cfg.rounded === 'lg'
      ? 'rounded-lg'
      : 'rounded-xl'

  const onPick = useCallback(
    (target: { type: 'route'; route: Route } | { type: 'app'; id: string } | { type: 'web'; url: string }) => {
      if (target.type === 'route') setRoute(target.route)
      if (target.type === 'app') window.location.hash = `/app?id=${encodeURIComponent(target.id)}`
      if (target.type === 'web') window.open(target.url, '_blank', 'noopener,noreferrer')
      setQuery('')
    },
    [setRoute],
  )

  const entries = useMemo(() => {
    const list: Array<{ key: string; label: string; action: () => void }> = []
    list.push({ key: 'route:/dashboard', label: 'Dashboard', action: () => onPick({ type: 'route', route: '/dashboard' }) })
    if (lmsEnabled) list.push({ key: 'route:/lms/dashboard', label: 'Learning', action: () => onPick({ type: 'route', route: '/lms/dashboard' }) })
    list.push({ key: 'route:/settings', label: 'Settings', action: () => onPick({ type: 'route', route: '/settings' }) })
    apps.filter((a) => a.enabled).forEach((a) => {
      list.push({ key: `app:${a.id}`, label: a.label, action: () => onPick({ type: 'app', id: a.id }) })
    })
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 6)
    return list.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 8)
  }, [apps, lmsEnabled, query, onPick])

  const renderSection = (key: string) => {
    switch (key) {
      case 'logo':
        return (
          <button
            key="logo"
            className="flex items-center gap-2 text-sm font-semibold text-slate-800"
            onClick={() => setRoute('/dashboard')}
            aria-label="Go to dashboard"
            title="Dashboard"
          >
            {cfg.showLogo && appearance.logoDataUrl ? (
              <img src={appearance.logoDataUrl} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--brand-color)' }} />
            )}
          </button>
        )
      case 'apps':
        if (!cfg.menuFromApps) return null
        return (
          <nav key="apps" className="hidden md:flex items-center gap-2">
            {apps
              .filter((a) => a.enabled)
              .slice(0, 6)
              .map((a) => (
                <button
                  key={a.id}
                  className="flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-slate-50"
                  onClick={() => onPick({ type: 'app', id: a.id })}
                  aria-label={`Open ${a.label}`}
                  title={a.label}
                >
                  {a.iconImage ? (
                    <img src={a.iconImage} alt="" className={cfg.compact ? 'h-4 w-4 object-contain' : 'h-5 w-5 object-contain'} />
                  ) : (
                    <span className="text-slate-700">{resolveIcon(a.icon, cfg.compact ? 14 : 16)}</span>
                  )}
                </button>
              ))}
          </nav>
        )
      case 'site':
        return menuItems.length ? (
          <nav key="site" className="hidden md:flex items-center gap-2">
            {menuItems
              .filter((m) => m.enabled !== false)
              .map((m) => (
                <button
                  key={m.id}
                  className="flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-slate-50"
                  onClick={() => window.open(m.url, '_blank', 'noopener,noreferrer')}
                  aria-label={m.label}
                  title={m.label}
                >
                  <span className="text-slate-700">{resolveIcon(m.icon || 'FiLink', cfg.compact ? 14 : 16)}</span>
                </button>
              ))}
          </nav>
        ) : null
      case 'search':
        if (!cfg.showSearch) return null
        return (
          <div key="search" className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setFocusedIdx(-1)
              }}
              onKeyDown={(e) => {
                if (!query) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setFocusedIdx((i) => Math.min(i + 1, entries.length))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setFocusedIdx((i) => Math.max(i - 1, -1))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (focusedIdx >= 0 && focusedIdx < entries.length) entries[focusedIdx].action()
                  else if (query.trim())
                    onPick({ type: 'web', url: `https://opendesignschool.ai/?s=${encodeURIComponent(query.trim())}` })
                } else if (e.key === 'Escape') {
                  setQuery('')
                  setFocusedIdx(-1)
                }
              }}
              placeholder="Search apps, pages, or ODSAi…"
              className={classNames(
                'rounded border focus:outline-none focus:ring-2 focus:ring-brand',
                cfg.compact ? 'w-48 px-2 py-1 text-sm' : 'w-56 px-3 py-2 text-sm',
              )}
              role="combobox"
              aria-expanded={!!query}
              aria-controls="header-search-list"
            />
            {query && (
              <div
                id="header-search-list"
                className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded border bg-white shadow"
                role="listbox"
              >
                {entries.map((e, idx) => (
                  <button
                    key={e.key}
                    onClick={e.action}
                    role="option"
                    aria-selected={focusedIdx === idx}
                    className={classNames(
                      'block w-full truncate px-2 py-1 text-left text-sm',
                      focusedIdx === idx ? 'bg-slate-100' : 'hover:bg-slate-50',
                    )}
                  >
                    {e.label}
                  </button>
                ))}
                <button
                  className="block w-full px-2 py-1 text-left text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => onPick({ type: 'web', url: `https://opendesignschool.ai/?s=${encodeURIComponent(query.trim())}` })}
                >
                  Search opendesignschool.ai for “{query}”
                </button>
              </div>
            )}
          </div>
        )
      case 'settings':
        return (
          <button
            key="settings"
            className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
            onClick={() => setRoute('/settings')}
            aria-label="Settings"
            title="Settings"
          >
            {resolveIcon('FiSettings', 16)}
          </button>
        )
      case 'home':
        return (
          <button
            key="home"
            className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
            onClick={() => setRoute('/dashboard')}
            aria-label="Home"
            title="Home"
          >
            {resolveIcon('FiHome', 16)}
          </button>
        )
      case 'auth':
        return signedIn ? (
          <button
            key="auth-logout"
            className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
            onClick={() => {
              if (confirm('Log out?')) {
                logout()
                toast.info('Logged out')
                setRoute('/dashboard')
              }
            }}
            aria-label="Logout"
            title="Logout"
          >
            {resolveIcon('FiLogOut', 16)}
          </button>
        ) : (
          <button
            key="auth-login"
            className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
            onClick={() => setRoute('/login')}
            aria-label="Sign in"
            title="Sign in"
          >
            {resolveIcon('FiLogIn', 16)}
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div
      ref={containerRef}
      className={classNames(
        'fixed left-0 right-0 top-0 z-30',
        'flex items-center justify-center px-2',
      )}
    >
      {cfg.edgeReveal && (
        <div
          className="fixed left-0 right-0 top-0 z-20 h-2 opacity-0"
          onMouseEnter={() => setOpen(true)}
          aria-hidden
        />
      )}
      {!enabled || hiddenForApp ? null : (
        <header
          className={classNames(
            'border bg-white/85 backdrop-blur transition-all shadow-sm',
            open ? '' : 'pointer-events-none',
            roundedClass,
            open ? 'opacity-100 translate-y-0' : 'opacity-80 -translate-y-2',
          )}
          style={{
            height: open ? expandedHeight : railHeight,
            background: open ? undefined : 'var(--brand-color)',
            borderColor: open ? undefined : 'transparent',
            boxShadow: open ? '0 6px 18px rgba(0,0,0,0.08)' : 'none',
            transition: 'height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out, transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out',
            width: containerWidth,
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
        <div className="flex h-full items-center gap-2 px-3" style={{ opacity: open ? 1 : 0, transition: 'opacity 160ms ease' }}>
          {(() => {
            const nodes: React.ReactNode[] = []
            let prevGroup: string | null = null
            const addSep = (key: string) => {
              if ((key === 'apps' || key === 'site') && prevGroup && prevGroup !== key) {
                nodes.push(<span key={`sep-${key}`} className="mx-1 h-4 w-px bg-slate-200/80" />)
              }
              if (key === 'apps' || key === 'site') prevGroup = key
            }
            ;(sectionOrder || ['logo','apps','site','search','auth']).forEach((key) => {
              addSep(key)
              const node = renderSection(key)
              if (node) nodes.push(node)
            })
            return nodes
          })()}
        </div>
      </header>
      )}
    </div>
  )
}
