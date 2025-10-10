import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useAppStore,
  type HeaderSectionKey,
  type Route,
  type HeaderSettings,
  type AppConfig,
} from '../store/appStore'
import { toast } from '../store/toastStore'
import { resolveIcon } from '../utils/iconCatalog'
import { FiMapPin } from 'react-icons/fi'

type RenderContext = {
  controlHeight: number
  controlWidth: (base?: number) => number
  iconSize: number
  focusRing: string
  onPick: (target: { type: 'route'; route: Route } | { type: 'app'; id: string } | { type: 'web'; url: string }) => void
  onLogout: () => void
  onLogin: () => void
  header: HeaderSettings
  apps: AppConfig[]
  siteMenu: HeaderSettings['menuItems']
  appearance: ReturnType<typeof useAppStore>['appSettings']['appearance']
  signedIn: boolean
  query: string
  setQuery: (value: string) => void
  entries: Array<{ key: string; label: string; action: () => void }>
  focusedIdx: number
  setFocusedIdx: React.Dispatch<React.SetStateAction<number>>
  showSearch: boolean
  showLogo: boolean
  lmsEnabled: boolean
  setRoute: (r: Route) => void
  pinAvailable: boolean
  onTogglePin: () => void
  pinPressed: boolean
  autoHide: boolean
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

const DEFAULT_SECTIONS: HeaderSectionKey[] = ['logo', 'apps', 'site', 'search', 'auth', 'pin']
const SPLIT_KEYS: HeaderSectionKey[] = ['search', 'auth', 'settings', 'pin']
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/65'

export default function HeaderBar() {
  const settings = useAppStore((s) => s.appSettings.header)
  const appearance = useAppStore((s) => s.appSettings.appearance)
  const apps = useAppStore((s) => s.appSettings.apps)
  const menuItems = useAppStore((s) => s.appSettings.header?.menuItems ?? [])
  const setRoute = useAppStore((s) => s.setRoute)
  const signedIn = useAppStore((s) => s.signedIn)
  const logout = useAppStore((s) => s.logout)
  const lmsEnabled = useAppStore((s) => s.appSettings.lms.enabled)
  const currentRoute = useAppStore((s) => s.route)

  // Fallback to defaults if header settings missing
  const cfg: HeaderSettings =
    settings ?? {
      enabled: false,
      autoHide: false,
      height: 56,
      rounded: 'xl',
      showLogo: true,
      showSearch: true,
      menuFromApps: true,
      compact: true,
      hideOnAppIds: [],
      edgeReveal: true,
      railHeight: 10,
      menuItems: [],
      sectionOrder: DEFAULT_SECTIONS,
      minWidth: 340,
      maxWidth: 960,
      horizontalPadding: 18,
      itemGap: 10,
      iconScale: 1,
      railColor: '',
      shadowOpacity: 0.08,
      collapsedOpacity: 0,
      logoDataUrl: undefined,
    }

  const edgeRevealEnabled = cfg.edgeReveal !== false
  const autoHide = cfg.autoHide !== false
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const collapseTimer = useRef<number | null>(null)
  const hoveringRef = useRef(false)

  const [pinned, setPinned] = useState(!autoHide)
  const [open, setOpen] = useState(!autoHide)
  const [query, setQuery] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [contentWidth, setContentWidth] = useState<number | null>(null)

  const parseActiveAppId = useCallback(() => {
    if (typeof window === 'undefined') return null
    const raw = (window.location.hash || '').replace(/^#/, '')
    const [pathOnly, queryString = ''] = raw.split('?')
    if (pathOnly !== '/app') return null
    const params = new URLSearchParams(queryString)
    return params.get('id')
  }, [])

  const activeAppId = parseActiveAppId()
  const hiddenForApp =
    currentRoute === '/app' && !!activeAppId && cfg.hideOnAppIds.includes(activeAppId)

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

  const collapsedHeight = Math.max(4, Math.min(40, cfg.railHeight ?? 10))
  const expandedHeight = Math.max(40, Math.min(96, cfg.height ?? 56))
  const baseControlHeight = Math.max(32, Math.min(64, expandedHeight - 8))
  const controlHeight = Math.round(baseControlHeight)
  const controlWidth = useCallback(
    (base = controlHeight) => Math.round(Math.max(32, Math.min(72, base))),
    [controlHeight],
  )
  const iconScale = Math.max(0.75, Math.min(1.5, cfg.iconScale ?? 1))
  const iconSize = Math.round(
    Math.max(18, Math.min(48, (controlHeight - 14) * iconScale)),
  )

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
  }, [])

  const scheduleCollapse = useCallback(() => {
    if (!autoHide || pinned) return
    clearCollapseTimer()
    collapseTimer.current = window.setTimeout(() => {
      if (hoveringRef.current) return
      setOpen(false)
      collapseTimer.current = null
    }, 240)
  }, [autoHide, pinned, clearCollapseTimer])

  const handleEnter = useCallback(() => {
    hoveringRef.current = true
    if (!autoHide) return
    clearCollapseTimer()
    setOpen(true)
  }, [autoHide, clearCollapseTimer])

  const handleLeave = useCallback(() => {
    hoveringRef.current = false
    scheduleCollapse()
  }, [scheduleCollapse])

  useEffect(() => {
    if (!autoHide) {
      setOpen(true)
      setPinned(false)
      return
    }
    if (!pinned) setOpen(false)
  }, [autoHide, pinned])

  useEffect(
    () => () => {
      clearCollapseTimer()
    },
    [clearCollapseTimer],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !contentRef.current || typeof ResizeObserver === 'undefined')
      return

    const observer = new ResizeObserver((entries) => {
      const latest = entries.at(-1)
      if (!latest) return
      const width = Math.ceil(latest.contentRect.width)
      if (!Number.isFinite(width) || width <= 0) return
      setContentWidth(width)
    })

    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [])

  const entries = useMemo(() => {
    const list: Array<{ key: string; label: string; action: () => void }> = []
    list.push({
      key: 'route:/dashboard',
      label: 'Dashboard',
      action: () => setRoute('/dashboard'),
    })
    if (lmsEnabled) {
      list.push({
        key: 'route:/lms/dashboard',
        label: 'Learning',
        action: () => setRoute('/lms/dashboard'),
      })
    }
    list.push({
      key: 'route:/settings',
      label: 'Settings',
      action: () => setRoute('/settings'),
    })
    apps
      .filter((a) => a.enabled)
      .forEach((app) => {
        list.push({
          key: `app:${app.id}`,
          label: app.label,
          action: () => {
            window.location.hash = `/app?id=${encodeURIComponent(app.id)}`
          },
        })
      })
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 8)
    return list.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 10)
  }, [apps, lmsEnabled, query, setRoute])

  const onPick = useCallback(
    (target: { type: 'route'; route: Route } | { type: 'app'; id: string } | { type: 'web'; url: string }) => {
      if (target.type === 'route') {
        setRoute(target.route)
      } else if (target.type === 'app') {
        window.location.hash = `/app?id=${encodeURIComponent(target.id)}`
      } else {
        window.open(target.url, '_blank', 'noopener,noreferrer')
      }
      setQuery('')
      setFocusedIdx(-1)
      if (autoHide && !pinned) setOpen(false)
    },
    [autoHide, pinned, setRoute],
  )

  const onLogout = useCallback(() => {
    if (!confirm('Log out?')) return
    logout()
    toast.info('Logged out')
    setRoute('/dashboard')
  }, [logout, setRoute])

  const sectionOrder = cfg.sectionOrder?.length ? cfg.sectionOrder : DEFAULT_SECTIONS
  const [leftKeys, rightKeys] = useMemo(() => {
    const left: HeaderSectionKey[] = []
    const right: HeaderSectionKey[] = []
    let toRight = false
    sectionOrder.forEach((key) => {
      if (key === 'pin' && !autoHide) return
      if (SPLIT_KEYS.includes(key)) toRight = true
      if (toRight) right.push(key)
      else left.push(key)
    })
    return [left, right]
  }, [sectionOrder, autoHide])

  const showPinControl = autoHide && sectionOrder.includes('pin')
  const showOverlayPin = autoHide && !open
  const showLogo = cfg.showLogo && appearance.showLogo !== false
  const showSearch = cfg.showSearch !== false

  const measured = contentWidth ?? cfg.minWidth
  const paddedMeasured = measured + cfg.horizontalPadding * 2
  const totalWidth = Math.max(cfg.minWidth, Math.min(cfg.maxWidth, paddedMeasured))
  const clampedLayout = paddedMeasured > cfg.maxWidth

  const renderCtx: RenderContext = {
    controlHeight,
    controlWidth,
    iconSize,
    focusRing,
    onPick,
    onLogout,
    onLogin: () => setRoute('/login'),
    header: cfg,
    apps,
    siteMenu: menuItems,
    appearance,
    signedIn,
    query,
    setQuery,
    entries,
    focusedIdx,
    setFocusedIdx,
    showSearch,
    showLogo,
    lmsEnabled,
    setRoute,
    pinAvailable: showPinControl,
    onTogglePin: () => ctxTogglePin(autoHide, setPinned, setOpen),
    pinPressed: pinned,
    autoHide,
  }

  const headerHeight = open ? expandedHeight : collapsedHeight
  const contentOpacity = open ? 1 : Math.max(0, Math.min(1, cfg.collapsedOpacity ?? 0))

  if (!cfg.enabled || hiddenForApp) return null

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex justify-center px-2"
    >
      <button
        className={classNames(
          'sr-only bg-brand px-3 py-2 text-sm text-white',
          focusRing,
          'focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-40 focus-visible:inline-block focus-visible:rounded',
        )}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'Hide navigation rail' : 'Show navigation rail'}
      </button>

      {edgeRevealEnabled && autoHide && !open && (
        <div
          className="pointer-events-auto fixed top-0 z-20 opacity-0"
          style={{
            width: totalWidth,
            height: Math.max(6, Math.min(32, collapsedHeight + 8)),
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          aria-hidden
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        />
      )}

      <header
        className={classNames(
          'pointer-events-auto relative border bg-white/80 backdrop-blur shadow-sm transition-all',
          roundedClass,
        )}
          style={{
            height: headerHeight,
            width: totalWidth,
            background: open ? 'rgba(255,255,255,0.82)' : cfg.railColor || 'var(--brand-color)',
            borderColor: open ? 'rgba(148,163,184,0.35)' : 'transparent',
            boxShadow: open ? `0 14px 38px rgba(15,23,42, ${cfg.shadowOpacity ?? 0.12})` : '0 6px 18px rgba(15,23,42,0.2)',
            transition: 'height 160ms cubic-bezier(0.22, 1, 0.36, 1), background 140ms ease, box-shadow 160ms ease, border-color 140ms ease, transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
            paddingLeft: cfg.horizontalPadding,
            paddingRight: cfg.horizontalPadding,
            overflow: 'hidden',
            willChange: 'transform, height',
          }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        aria-describedby="header-rail-instructions"
        >
          {showOverlayPin && (
            <button
              type="button"
              className={classNames(
                'absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md border bg-white/95 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white',
                focusRing,
                pinned ? 'border-brand text-brand' : 'border-slate-200',
              )}
              style={{
                height: Math.max(28, Math.min(38, controlHeight - 6)),
                width: Math.max(32, Math.min(46, controlWidth() - 8)),
              }}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin header' : 'Pin header'}
              title={pinned ? 'Unpin header' : 'Pin header'}
              onClick={() => ctxTogglePin(autoHide, setPinned, setOpen)}
              onFocus={() => setOpen(true)}
            >
              <FiMapPin size={Math.max(14, iconSize - 6)} />
            </button>
          )}
          <span id="header-rail-instructions" className="sr-only">
            Header rail expanded. Use Tab to move between sections. Use the pin control to keep the rail
            visible.
          </span>

        <div
          ref={contentRef}
          className="flex h-full w-full items-center justify-between"
          style={{
            gap: clampedLayout ? Math.max(4, Math.floor(cfg.itemGap * 0.75)) : cfg.itemGap,
            opacity: contentOpacity,
            pointerEvents: open ? 'auto' : 'none',
            transition: 'opacity 180ms ease',
          }}
          aria-hidden={!open && !pinned}
        >
          <nav
            className="flex items-center"
            style={{ gap: clampedLayout ? Math.max(4, Math.floor(cfg.itemGap * 0.75)) : cfg.itemGap }}
            aria-label="Primary"
          >
            {renderSections(leftKeys, renderCtx, 'left')}
          </nav>
          <nav
            className="flex items-center justify-end"
            style={{ gap: clampedLayout ? Math.max(4, Math.floor(cfg.itemGap * 0.75)) : cfg.itemGap }}
            aria-label="Secondary"
          >
            {renderSections(rightKeys, renderCtx, 'right')}
          </nav>
        </div>
      </header>
    </div>
  )
}

function ctxTogglePin(
  autoHide: boolean,
  setPinned: React.Dispatch<React.SetStateAction<boolean>>,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
  if (!autoHide) return
  setPinned((prev) => {
    const next = !prev
    if (next) setOpen(true)
    else setOpen(false)
    return next
  })
}

function renderSections(
  keys: HeaderSectionKey[],
  ctx: RenderContext,
  region: 'left' | 'right',
) {
  if (!keys.length) return null
  return keys.map((key, idx) => renderSection(key, `${region}-${idx}`, ctx))
}

function renderSection(key: HeaderSectionKey, reactKey: string, ctx: RenderContext) {
  switch (key) {
    case 'logo': {
      if (!ctx.showLogo) return null
      const logoSrc = ctx.header.logoDataUrl || ctx.appearance.logoDataUrl
      return (
        <button
          key={reactKey}
          className={classNames(
            'flex items-center gap-2 text-sm font-semibold text-slate-800 transition hover:text-brand',
            ctx.focusRing,
          )}
          style={{ height: ctx.controlHeight }}
          onClick={() => ctx.setRoute('/dashboard')}
          aria-label="Dashboard"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Header logo"
              className="h-6 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: 'var(--brand-color)' }}
            />
          )}
          <span className="hidden text-xs font-medium text-slate-500 md:inline">
            {ctx.appearance.title || 'Home'}
          </span>
        </button>
      )
    }

    case 'apps': {
      if (!ctx.header.menuFromApps) return null
      const enabledApps = ctx.apps.filter(
        (app) => app.enabled && (!app.adminOnly || ctx.signedIn),
      )
      if (!enabledApps.length) return null
      const maxIcons = ctx.header.compact ? 6 : 8
      return (
        <div key={reactKey} className="flex items-center" style={{ gap: ctx.header.itemGap }}>
          {enabledApps.slice(0, maxIcons).map((app) => (
            <button
              key={app.id}
              className={classNames(
                'flex items-center justify-center rounded border bg-white/70 px-2 transition-colors hover:bg-slate-50',
                ctx.focusRing,
              )}
              style={{
                height: ctx.controlHeight,
                width: ctx.controlWidth(),
              }}
              title={app.label}
              aria-label={`Open ${app.label}`}
              onClick={() => ctx.onPick({ type: 'app', id: app.id })}
            >
              {app.iconImage ? (
                <img
                  src={app.iconImage}
                  alt=""
                  className="object-contain"
                  style={{ width: ctx.iconSize, height: ctx.iconSize }}
                />
              ) : (
                <span className="text-slate-700">
                  {resolveIcon(app.icon, Math.max(16, ctx.iconSize - 4))}
                </span>
              )}
            </button>
          ))}
        </div>
      )
    }

    case 'site': {
      const visible = ctx.siteMenu.filter((item) => item.enabled !== false)
      if (!visible.length) return null
      return (
        <div key={reactKey} className="flex items-center" style={{ gap: ctx.header.itemGap }}>
          {visible.map((item) => (
            <button
              key={item.id}
              className={classNames(
                'flex items-center justify-center rounded border bg-white/70 px-2 transition-colors hover:bg-slate-50',
                ctx.focusRing,
              )}
              style={{
                height: ctx.controlHeight,
                width: ctx.controlWidth(),
              }}
              title={item.label}
              aria-label={item.label}
              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
            >
              <span className="text-slate-700">
                {resolveIcon(item.icon || 'FiExternalLink', Math.max(16, ctx.iconSize - 4))}
              </span>
            </button>
          ))}
        </div>
      )
    }

    case 'search': {
      if (!ctx.showSearch) return null
      return (
        <div key={reactKey} className="relative">
          <input
            value={ctx.query}
            onChange={(e) => {
              ctx.setQuery(e.target.value)
              ctx.setFocusedIdx(-1)
            }}
            onKeyDown={(e) => {
              if (!ctx.query) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                ctx.setFocusedIdx((i) => Math.min(i + 1, ctx.entries.length))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                ctx.setFocusedIdx((i) => Math.max(i - 1, -1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (ctx.focusedIdx >= 0 && ctx.focusedIdx < ctx.entries.length) {
                  ctx.entries[ctx.focusedIdx].action()
                } else if (ctx.query.trim()) {
                  ctx.onPick({
                    type: 'web',
                    url: `https://opendesignschool.ai/?s=${encodeURIComponent(ctx.query.trim())}`,
                  })
                }
              } else if (e.key === 'Escape') {
                ctx.setQuery('')
                ctx.setFocusedIdx(-1)
              }
            }}
            placeholder="Search apps, pages, or ODSAi…"
            className={classNames(
              'w-56 rounded border bg-white/80 px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand',
              ctx.header.compact && 'w-48 px-2',
            )}
            style={{ height: ctx.controlHeight }}
            role="combobox"
            aria-expanded={!!ctx.query}
            aria-controls="header-search-list"
          />
          {ctx.query && (
            <div
              id="header-search-list"
              className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded border bg-white shadow"
              role="listbox"
            >
              {ctx.entries.map((entry, idx) => {
                const [kind] = entry.key.split(':') as [string]
                const icon =
                  kind === 'route'
                    ? resolveIcon('FiNavigation', 16)
                    : kind === 'app'
                    ? resolveIcon('FiGrid', 16)
                    : resolveIcon('FiLink', 16)
                const badge = kind === 'route' ? 'page' : kind === 'app' ? 'app' : 'link'
                return (
                  <button
                    key={entry.key}
                    role="option"
                    aria-selected={ctx.focusedIdx === idx}
                    className={classNames(
                      'flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition hover:bg-slate-50',
                      ctx.focusedIdx === idx && 'bg-slate-100',
                    )}
                    onClick={entry.action}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                      {icon}
                    </span>
                    <span className="flex-1 truncate">{entry.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {badge}
                    </span>
                  </button>
                )
              })}
              <button
                className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                onClick={() =>
                  ctx.onPick({
                    type: 'web',
                    url: `https://opendesignschool.ai/?s=${encodeURIComponent(ctx.query.trim())}`,
                  })
                }
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                  {resolveIcon('FiSearch', 16)}
                </span>
                <span className="flex-1 truncate">Search opendesignschool.ai for “{ctx.query}”</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  web
                </span>
              </button>
            </div>
          )}
        </div>
      )
    }

    case 'settings':
      return (
        <button
          key={reactKey}
          className={classNames(
            'flex items-center justify-center rounded border bg-white/70 px-2 text-sm transition hover:bg-slate-100',
            ctx.focusRing,
          )}
          style={{
            height: ctx.controlHeight,
            width: ctx.controlWidth(),
          }}
          title="Settings"
          aria-label="Settings"
          onClick={() => ctx.setRoute('/settings')}
        >
          {resolveIcon('FiSettings', Math.max(18, ctx.iconSize - 2))}
        </button>
      )

    case 'home':
      return (
        <button
          key={reactKey}
          className={classNames(
            'flex items-center justify-center rounded border bg-white/70 px-2 text-sm transition hover:bg-slate-100',
            ctx.focusRing,
          )}
          style={{
            height: ctx.controlHeight,
            width: ctx.controlWidth(),
          }}
          title="Home"
          aria-label="Home"
          onClick={() => ctx.setRoute('/dashboard')}
        >
          {resolveIcon('FiHome', Math.max(18, ctx.iconSize - 2))}
        </button>
      )

    case 'auth':
      if (ctx.signedIn) {
        return (
          <button
            key={reactKey}
            className={classNames(
              'flex items-center justify-center rounded border bg-white/70 px-2 text-sm text-slate-700 transition hover:bg-slate-100',
              ctx.focusRing,
            )}
            style={{
              height: ctx.controlHeight,
              width: ctx.controlWidth(),
            }}
            title="Logout"
            aria-label="Logout"
            onClick={ctx.onLogout}
          >
            {resolveIcon('FiLogOut', Math.max(18, ctx.iconSize - 2))}
          </button>
        )
      }
      return (
        <button
          key={reactKey}
          className={classNames(
            'flex items-center justify-center rounded border bg-white/70 px-2 text-sm transition hover:bg-slate-100',
            ctx.focusRing,
          )}
          style={{
            height: ctx.controlHeight,
            width: ctx.controlWidth(),
          }}
          title="Sign in"
          aria-label="Sign in"
          onClick={ctx.onLogin}
        >
          {resolveIcon('FiLogIn', Math.max(18, ctx.iconSize - 2))}
        </button>
      )

    case 'pin':
      if (!ctx.pinAvailable) return null
      return (
        <button
          key={reactKey}
          type="button"
          className={classNames(
            'flex items-center justify-center rounded-md border bg-white/95 px-2 text-sm transition hover:bg-slate-100',
            ctx.focusRing,
            ctx.pinPressed ? 'border-brand text-brand' : 'border-slate-200 text-slate-500',
          )}
          style={{
            height: ctx.controlHeight,
            width: ctx.controlWidth(),
            opacity: ctx.autoHide ? 1 : 0.4,
            cursor: ctx.autoHide ? 'pointer' : 'not-allowed',
          }}
          aria-pressed={ctx.pinPressed}
          aria-label={ctx.pinPressed ? 'Unpin header' : 'Pin header'}
          title={ctx.pinPressed ? 'Unpin header' : 'Pin header'}
          onClick={() => {
            if (!ctx.autoHide) return
            ctx.onTogglePin()
          }}
          disabled={!ctx.autoHide}
        >
          <FiMapPin size={Math.max(16, ctx.iconSize - 4)} />
        </button>
      )

    case 'spacer':
      return <span key={reactKey} className="block" style={{ width: ctx.header.itemGap }} />

    default:
      return null
  }
}
