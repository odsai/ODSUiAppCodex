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
  const updateSettings = useAppStore((s) => s.updateSettings)
  const signedIn = useAppStore((s) => s.signedIn)
  const logout = useAppStore((s) => s.logout)
  const lmsEnabled = useAppStore((s) => s.appSettings.lms.enabled)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!settings) return
    setOpen(settings.pinned)
  }, [settings])

  const enabled = !!settings?.enabled

  const heightClass = settings.height >= 64 ? 'h-16' : settings.height >= 56 ? 'h-14' : 'h-12'
  const roundedClass =
    settings.rounded === 'none'
      ? 'rounded-none'
      : settings.rounded === 'sm'
      ? 'rounded'
      : settings.rounded === 'md'
      ? 'rounded-md'
      : settings.rounded === 'lg'
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

  return (
    <div ref={containerRef} className="fixed left-0 right-0 top-0 z-30 flex items-center justify-center px-2">
      {!enabled ? null : (
      <header
        className={classNames(
          'mt-2 w-full max-w-6xl border bg-white/85 backdrop-blur transition-all shadow-sm',
          heightClass,
          roundedClass,
          open ? 'opacity-100 translate-y-0' : 'opacity-60 -translate-y-8 hover:translate-y-0 hover:opacity-100',
        )}
        onMouseEnter={() => settings.autoHide && setOpen(true)}
        onMouseLeave={() => settings.autoHide && !settings.pinned && setOpen(false)}
      >
        <div className="flex h-full items-center justify-between gap-3 px-3">
          {/* Left: Logo / Title */}
          <button
            className="flex items-center gap-2 text-sm font-semibold text-slate-800"
            onClick={() => setRoute('/dashboard')}
            aria-label="Go to dashboard"
          >
            {settings.showLogo && appearance.logoDataUrl ? (
              <img src={appearance.logoDataUrl} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--brand-color)' }} />
            )}
            <span className="hidden sm:inline">{appearance.title || 'ODSAi Studio'}</span>
          </button>

          {/* Middle: Menu from Apps */}
          {settings.menuFromApps && (
            <nav className="hidden md:flex items-center gap-2">
              {apps
                .filter((a) => a.enabled)
                .slice(0, 6)
                .map((a) => (
                  <button
                    key={a.id}
                    className="flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-slate-50"
                    onClick={() => onPick({ type: 'app', id: a.id })}
                    aria-label={`Open ${a.label}`}
                  >
                    {a.iconImage ? (
                      <img src={a.iconImage} alt="" className="h-4 w-4 object-contain" />
                    ) : (
                      <span className="text-slate-700">{resolveIcon(a.icon, 14)}</span>
                    )}
                    <span className="hidden lg:inline">{a.label}</span>
                  </button>
                ))}
            </nav>
          )}

          {/* Right: Search + Auth + Pin */}
          <div className="flex items-center gap-2">
            {settings.showSearch && (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (entries.length) entries[0].action()
                      else if (query.trim()) onPick({ type: 'web', url: `https://opendesignschool.ai/?s=${encodeURIComponent(query.trim())}` })
                    }
                  }}
                  placeholder="Search apps, pages, or ODSAi…"
                  className="w-56 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {query && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded border bg-white shadow">
                    {entries.map((e) => (
                      <button
                        key={e.key}
                        onClick={e.action}
                        className="block w-full truncate px-2 py-1 text-left text-sm hover:bg-slate-50"
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
            )}

            {signedIn ? (
              <button
                className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
                onClick={() => {
                  if (confirm('Log out?')) {
                    logout()
                    toast.info('Logged out')
                    setRoute('/dashboard')
                  }
                }}
              >
                Logout
              </button>
            ) : (
              <button
                className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
                onClick={() => setRoute('/login')}
              >
                Sign in
              </button>
            )}

            <button
              aria-label={settings.pinned ? 'Unpin header' : 'Pin header'}
              className="rounded border px-2 py-1 text-sm hover:bg-slate-50"
              onClick={() => updateSettings({ header: { ...settings, pinned: !settings.pinned } })}
            >
              {settings.pinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        </div>
      </header>
      )}
    </div>
  )
}
