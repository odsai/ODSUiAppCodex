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
import { useAppStore, type Route } from './store/appStore'
import Toaster from './components/Toaster'

const App = () => {
  const route = useAppStore((s) => s.route)
  const signedIn = useAppStore((s) => s.signedIn)
  const setRoute = useAppStore((s) => s.setRoute)
  const selectCourse = useAppStore((s) => s.selectCourse)

  // Sync with hash-based routing
  useEffect(() => {
    const parseHash = (): { path: Route; params: URLSearchParams } => {
      const raw = (window.location.hash || '').replace(/^#/, '')
      const [pathOnly, query = ''] = raw.split('?')
      const params = new URLSearchParams(query)
      const valid: Route[] = ['/dashboard', '/ai', '/penpot', '/flowise', '/excalidraw', '/comfyui', '/groups', '/settings', '/login']
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
    const want = route === '/ai' && curPath === '/ai' && curQuery ? `#${curPath}?${curQuery}` : `#${route}`
    if (window.location.hash !== want) window.location.hash = want
  }, [route])

  let page = null
  switch (route) {
    case '/ai': page = <OWUI />; break
    case '/penpot': page = <Penpot />; break
    case '/flowise': page = <Flowise />; break
    case '/excalidraw': page = <Excalidraw />; break
    case '/comfyui': page = <ComfyUI />; break
    case '/groups': page = <Groups />; break
    case '/settings': page = <Settings />; break
    case '/dashboard': page = <Dashboard />; break
    default: page = <OWUI />
  }

  return (
    <main className="min-h-screen p-6">
      {page}
      {/* Floating pill menu appears only after sign-in */}
      {signedIn && (
        <PillMenu setRoute={(r: Route) => setRoute(r)} onDashboard={() => setRoute('/dashboard')} />
      )}
      <Toaster />
    </main>
  )
}
export default App
