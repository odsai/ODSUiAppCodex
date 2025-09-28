import React, { useEffect } from 'react'
import PillMenu from './components/PillMenu'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import OWUI from './pages/OWUI'
import Penpot from './pages/Penpot'
import Flowise from './pages/Flowise'
import Excalidraw from './pages/Excalidraw'
import ComfyUI from './pages/ComfyUI'
import Groups from './pages/Groups'
import Settings from './pages/Settings'
import ExternalApp from './pages/ExternalApp'
import LmsDashboard from './lms/pages/Dashboard'
import { Courses as LmsCourses, CourseDetail as LmsCourseDetail, LessonPlayer as LmsLessonPlayer } from './lms/pages'
import { useAppStore, type Route } from './store/appStore'
import Toaster from './components/Toaster'

const App = () => {
  const route = useAppStore((s) => s.route)
  const signedIn = useAppStore((s) => s.signedIn)
  const theme = useAppStore((s) => s.theme)
  const appearance = useAppStore((s) => s.appSettings.appearance)
  const setRoute = useAppStore((s) => s.setRoute)
  const selectCourse = useAppStore((s) => s.selectCourse)

  // Sync with hash-based routing
  useEffect(() => {
    const parseHash = (): { path: Route; params: URLSearchParams } => {
      const raw = (window.location.hash || '').replace(/^#/, '')
      const [pathOnly, query = ''] = raw.split('?')
      const params = new URLSearchParams(query)
      const valid: Route[] = [
        '/dashboard',
        '/ai',
        '/penpot',
        '/flowise',
        '/excalidraw',
        '/comfyui',
        '/groups',
        '/settings',
        '/login',
        '/app',
        '/lms/dashboard',
        '/lms/courses',
        '/lms/course',
        '/lms/lesson',
      ]
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
    const preserve = new Set(['/ai', '/app', '/lms/course', '/lms/lesson'])
    const want = preserve.has(route) && curPath === route && curQuery ? `#${curPath}?${curQuery}` : `#${route}`
    if (window.location.hash !== want) window.location.hash = want
  }, [route])

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
    case '/lms/dashboard': page = <LmsDashboard />; break
    case '/lms/courses': page = <LmsCourses />; break
    case '/lms/course': page = <LmsCourseDetail />; break
    case '/lms/lesson': page = <LmsLessonPlayer />; break
    case '/app': page = <ExternalApp />; break
    case '/dashboard': page = <Dashboard />; break
    default: page = <OWUI />
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main" className={`min-h-screen ${route === '/app' ? 'p-0' : 'p-6'}`}>
      {/* Error boundary helps avoid blank screens on unexpected render errors */}
      <ErrorBoundary>
        {page}
      </ErrorBoundary>
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
