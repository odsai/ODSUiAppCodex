import React, { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import LoginCard from '../components/LoginCard'
import CreateProjectModal from '../components/CreateProjectModal'

export default function Dashboard() {
  const signedIn = useAppStore((s) => s.signedIn)
  const user = useAppStore((s) => s.user)
  const isAdmin = !!user?.roles?.includes('admin')
  const projects = useAppStore((s) => s.projects)
  const courses = useAppStore((s) => s.courses)
  const setRoute = useAppStore((s) => s.setRoute)
  const selectProject = useAppStore((s) => s.selectProject)
  const selectCourse = useAppStore((s) => s.selectCourse)
  const appearance = useAppStore((s) => s.appSettings.appearance)

  const [showLogin, setShowLogin] = useState(false)

  const [creating, setCreating] = useState(false)

  const projectCards = useMemo(() => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            selectProject(p.id)
            setRoute('/ai')
          }}
          className="surface-card text-left rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold">{p.name}</h3>
          {p.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-200/80">{p.description}</p>}
        </button>
      ))}
      <button
        onClick={() => setCreating(true)}
        className="rounded-2xl border-2 border-dashed p-4 text-slate-600 transition-colors hover:bg-slate-100/60 dark:border-slate-500/50 dark:text-slate-300 dark:hover:bg-slate-800/40"
      >
        + Create Project
      </button>
    </div>
  ), [projects, selectProject, setRoute])

  const courseCards = useMemo(() => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <button
          key={c.id}
          onClick={() => {
            selectCourse(c.id)
            window.location.hash = `/ai?channel=${encodeURIComponent(c.id)}`
          }}
          className="surface-card text-left rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold">{c.title}</h3>
          {c.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-200/80">{c.description}</p>}
        </button>
      ))}
    </div>
  ), [courses, selectCourse])

  const alignmentClass =
    appearance.introAlignment === 'left' ? 'items-start text-left' : 'items-center text-center'
  const brandColor = appearance.brandColor || 'var(--brand-color)'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className={`flex flex-col ${alignmentClass} space-y-4`}>
        {appearance.showLogo !== false && (
          appearance.logoDataUrl ? (
            <img
              src={appearance.logoDataUrl}
              alt="Studio logo"
              className="h-24 w-auto max-w-xs object-contain"
            />
          ) : appearance.iconDataUrl ? (
            <img
              src={appearance.iconDataUrl}
              alt="Studio icon"
              className="h-24 w-24 object-contain"
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg"
              style={{ background: brandColor }}
            >
              {appearance.title ? appearance.title.slice(0, 2).toUpperCase() : 'Studio'}
            </div>
          )
        )}
        <h1 className="text-3xl font-bold" style={{ color: brandColor }}>
          {appearance.title || 'Welcome to ODSAiStudio!'}
        </h1>
        {appearance.intro && (
          <p className="max-w-2xl text-base text-slate-600 dark:text-slate-200/80">{appearance.intro}</p>
        )}
        {!signedIn && (
          <button
            onClick={() => setShowLogin((s) => !s)}
            className="rounded-full px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
            style={{ background: brandColor }}
          >
            Sign in with your ODSAi credentials
          </button>
        )}
      </div>

      {!signedIn && showLogin && (<LoginCard onClose={()=> setShowLogin(false)} />)}

      {signedIn && (
        <div className="space-y-10">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Projects</h2>
            </div>
            {!creating && projectCards}
            {creating && (<CreateProjectModal onClose={()=> setCreating(false)} />)}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Courses</h2>
            </div>
            {courseCards}
          </section>

          {isAdmin && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Admin</h2>
              <button
                onClick={() => setRoute('/settings')}
                className="surface-card rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                Admin Settings
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
