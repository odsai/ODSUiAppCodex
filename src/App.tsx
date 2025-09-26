import React, { useEffect } from 'react'
import PillMenu from './components/PillMenu'
import Dashboard from './pages/Dashboard'
import OWUI from './pages/OWUI'
import Penpot from './pages/Penpot'
import Flowise from './pages/Flowise'
import Excalidraw from './pages/Excalidraw'
import ComfyUI from './pages/ComfyUI'
import Groups from './pages/Groups'
import Settings from './pages/Settings'
import ExternalApp from './pages/ExternalApp'
import { useAppStore, type Route } from './store/appStore'
import Toaster from './components/Toaster'

const App = () => {
  const route = useAppStore((s) => s.route)
  const signedIn = useAppStore((s) => s.signedIn)
  const theme = useAppStore((s) => s.theme)
  const appSettings = useAppStore((s) => s.appSettings)
  const appearance = appSettings.appearance
  const setRoute = useAppStore((s) => s.setRoute)
  const selectCourse = useAppStore((s) => s.selectCourse)

  // Sync with hash-based routing
  useEffect(() => {
    const parseHash = (): { path: Route; params: URLSearchParams } => {
      const raw = (window.location.hash || '').replace(/^#/, '')
      const [pathOnly, query = ''] = raw.split('?')
      const params = new URLSearchParams(query)
      const valid: Route[] = ['/dashboard', '/ai', '/penpot', '/flowise', '/excalidraw', '/comfyui', '/groups', '/settings', '/login', '/app']
      const path = valid.includes(pathOnly as Route) ? (pathOnly as Route) : '/dashboard'
      return { path, params }
    }

    // On mount, hydrate from hash; default to /dashboard
    const initial = parseHash()
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
      window.location.hash = '/dashboard'
    }
    setRoute(initial.path)
    if (initial.path === '/ai') {
      const channel = initial.params.get('channel')
      if (channel) selectCourse(channel)
    }
    // No extra handling for /app here; the page reads params directly

    const onHash = () => {
      const next = parseHash()
      setRoute(next.path)
      if (next.path === '/ai') {
        const channel = next.params.get('channel')
        if (channel) selectCourse(channel)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Propagate route changes (path only) -> hash (preserve query if present when staying on /ai)
  useEffect(() => {
    const current = window.location.hash.replace(/^#/, '')
    const [curPath, curQuery = ''] = current.split('?')
    const want =
      (route === '/ai' && curPath === '/ai' && curQuery) || (route === '/app' && curPath === '/app' && curQuery)
        ? `#${curPath}?${curQuery}`
        : `#${route}`
    if (window.location.hash !== want) window.location.hash = want
  }, [route])

  // Default-after-login guard on hydrate and when signing in
  useEffect(() => {
    if (signedIn && route === '/dashboard') {
      const next = appSettings?.routes?.defaultAfterLogin || '/dashboard'
      if (next && next !== '/dashboard') setRoute(next)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  // Apply dark class based on theme preference
  useEffect(() => {
    const root = document.documentElement
    const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && preferDark)
    root.classList.toggle('dark', isDark)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const palette = appearance.palettes.find((p) => p.id === appearance.selectedPaletteId) || appearance.palettes[0]
    root.style.setProperty('--brand-color', appearance.brandColor || palette?.primary || '#B13634')
    if (palette) {
      root.style.setProperty('--brand-secondary', palette.secondary)
      root.style.setProperty('--brand-accent', palette.accent)
    }
  }, [appearance])

  let page = null
  switch (route) {
    case '/ai': page = <OWUI />; break
    case '/penpot': page = <Penpot />; break
    case '/flowise': page = <Flowise />; break
    case '/excalidraw': page = <Excalidraw />; break
    case '/comfyui': page = <ComfyUI />; break
    case '/groups': page = <Groups />; break
    case '/settings': page = <Settings />; break
    case '/app': page = <ExternalApp />; break
    case '/dashboard': page = <Dashboard />; break
    default: page = <OWUI />
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main" className={`min-h-screen ${route === '/app' ? 'p-0' : 'p-6'}`}>
      {page}
      {/* Floating pill menu appears only after sign-in */}
      {signedIn && (
        <PillMenu setRoute={(r: Route) => setRoute(r)} onDashboard={() => setRoute('/dashboard')} />
      )}
      <Toaster />
    </main>
    </>
  )
}
export default App
