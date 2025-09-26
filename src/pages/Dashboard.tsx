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

  const [showLogin, setShowLogin] = useState(false)

  const [creating, setCreating] = useState(false)

  const projectCards = useMemo(() => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <button key={p.id} onClick={() => { selectProject(p.id); setRoute('/ai') }} className="text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md">
          <h3 className="text-lg font-semibold">{p.name}</h3>
          {p.description && <p className="mt-2 text-sm text-slate-600">{p.description}</p>}
        </button>
      ))}
      <button onClick={() => setCreating(true)} className="rounded-2xl border-2 border-dashed p-4 text-slate-600 hover:bg-slate-50">
        + Create Project
      </button>
    </div>
  ), [projects, selectProject, setRoute])

  const courseCards = useMemo(() => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <button key={c.id} onClick={() => { selectCourse(c.id); window.location.hash = `/ai?channel=${encodeURIComponent(c.id)}` }} className="text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md">
          <h3 className="text-lg font-semibold">{c.title}</h3>
          {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
        </button>
      ))}
    </div>
  ), [courses, selectCourse])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* header controls intentionally removed per UI request */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="h-24 w-24 rounded-full flex items-center justify-center bg-brand text-white text-xl font-bold">Logo</div>
        <h1 className="text-3xl font-bold">Welcome to ODSAiStudio!</h1>
        <p className="max-w-2xl text-slate-600">Unified interface for OpenSource AI tools in Design Pedagogy.</p>
        {!signedIn && (
          <button onClick={() => setShowLogin((s) => !s)} className="px-4 py-1.5 rounded bg-brand text-white text-sm font-medium hover:brightness-95">Sign in with your ODSAi credentials</button>
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
              <button onClick={() => setRoute('/settings')} className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md">Admin Settings</button>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
