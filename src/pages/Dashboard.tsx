import React, { useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { toast } from '../store/toastStore'

export default function Dashboard() {
  const signedIn = useAppStore((s) => s.signedIn)
  const user = useAppStore((s) => s.user)
  const isAdmin = !!user?.roles?.includes('admin')
  const projects = useAppStore((s) => s.projects)
  const courses = useAppStore((s) => s.courses)
  const setRoute = useAppStore((s) => s.setRoute)
  const login = useAppStore((s) => s.login)
  const createProject = useAppStore((s) => s.createProject)
  const selectProject = useAppStore((s) => s.selectProject)
  const selectCourse = useAppStore((s) => s.selectCourse)

  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Signed in successfully')
      setShowLogin(false)
    } catch (err: any) {
      const msg = err?.message || 'Login failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const [creating, setCreating] = useState(false)
  const [pname, setPname] = useState('')
  const [pdesc, setPdesc] = useState('')
  const createProjectNow = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pname.trim()) return
    const p = createProject({ name: pname.trim(), description: pdesc.trim() || undefined })
    toast.success('Project created')
    setPname(''); setPdesc(''); setCreating(false)
    selectProject(p.id)
    setRoute('/ai')
  }

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
  ), [projects])

  const courseCards = useMemo(() => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <button key={c.id} onClick={() => { selectCourse(c.id); window.location.hash = `/ai?channel=${encodeURIComponent(c.id)}` }} className="text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md">
          <h3 className="text-lg font-semibold">{c.title}</h3>
          {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
        </button>
      ))}
    </div>
  ), [courses])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {signedIn && (
        <div className="flex items-center justify-end gap-3">
          <div className="text-sm text-slate-700">{user?.name} ({user?.email})</div>
          <button
            className="rounded border px-3 py-1 hover:bg-slate-50"
            onClick={() => {
              if (confirm('Are you sure you want to log out?')) {
                useAppStore.getState().logout()
                toast.info('Logged out')
                setRoute('/dashboard')
              }
            }}
          >
            Logout
          </button>
        </div>
      )}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="h-24 w-24 rounded-full flex items-center justify-center bg-brand text-white text-xl font-bold">Logo</div>
        <h1 className="text-3xl font-bold">Welcome to ODSAiStudio!</h1>
        <p className="max-w-2xl text-slate-600">Unified interface for OpenSource AI tools in Design Pedagogy.</p>
        {!signedIn && (
          <button onClick={() => setShowLogin((s) => !s)} className="px-4 py-1.5 rounded bg-brand text-white text-sm font-medium hover:brightness-95">Sign in with your ODSAi credentials</button>
        )}
      </div>

      {!signedIn && showLogin && (
        <form onSubmit={handleLogin} className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Sign in</h2>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <label className="mt-4 block text-sm font-medium">Password</label>
          <input type="password" className="mt-1 w-full rounded border px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button disabled={loading} className="rounded bg-brand px-4 py-2 text-white disabled:opacity-50">{loading? 'Signing in...' : 'Sign in'}</button>
            <a className="text-sm text-slate-600 hover:underline" href="#" onClick={(e)=>e.preventDefault()}>Create account on ODSAi</a>
            <a className="text-sm text-slate-600 hover:underline" href="#" onClick={(e)=>e.preventDefault()}>Forgot password?</a>
          </div>
          <p className="mt-3 text-xs text-slate-500">Tip: use email starting with "admin" to see admin features.</p>
        </form>
      )}

      {signedIn && (
        <div className="space-y-10">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Projects</h2>
            </div>
            {!creating && projectCards}
            {creating && (
              <form onSubmit={createProjectNow} className="max-w-md rounded-2xl border bg-white p-4 shadow">
                <h3 className="font-semibold mb-2">Create Project</h3>
                <label className="block text-sm font-medium">Name</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={pname} onChange={(e)=>setPname(e.target.value)} required minLength={3} maxLength={80} />
                <label className="mt-3 block text-sm font-medium">Description</label>
                <textarea className="mt-1 w-full rounded border px-3 py-2" value={pdesc} onChange={(e)=>setPdesc(e.target.value)} maxLength={500} />
                <div className="mt-4 flex gap-3">
                  <button className="rounded bg-brand px-4 py-2 text-white">Create</button>
                  <button type="button" onClick={()=>setCreating(false)} className="rounded border px-4 py-2">Cancel</button>
                </div>
              </form>
            )}
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
