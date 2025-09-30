import React, { useEffect, useMemo, useState } from 'react'
import { useLmsStore } from '../store/lmsStore'
import { useAppStore, type Route } from '../../store/appStore'
import { getCourses } from '../api/courses'

const Courses: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const courses = useLmsStore((s) => s.courses)
  const setCourses = useLmsStore((s) => s.setCourses)
  const recentLimit = useLmsStore((s) => s.settings.recentCoursesLimit)
  const lms = useAppStore((s) => s.appSettings.lms)
  const setRoute = useAppStore((s) => s.setRoute)
  const token = useAppStore((s) => s.token)

  useEffect(() => {
    if (!lms.apiBaseUrl) return
    let cancelled = false
    setLoading(true)
    getCourses({ apiBaseUrl: lms.apiBaseUrl, token })
      .then((list) => {
        if (!cancelled && list.length) setCourses(list)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [lms.apiBaseUrl, setCourses, token])

  const list = useMemo(() => courses.slice(0, Math.max(recentLimit, courses.length)), [courses, recentLimit])

  const openCourse = (id: string) => {
    const url = new URL(window.location.href)
    url.hash = '/lms/course?id=' + encodeURIComponent(id)
    window.location.href = url.toString()
    setRoute('/lms/course' as Route)
  }

  // no-op placeholder removed to satisfy lint

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="mt-2 text-slate-600">Browse your learning catalog.</p>
      </header>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {loading && <p className="text-sm text-slate-500">Loading courses…</p>}
        {!loading && list.length === 0 && (
          <p className="text-sm text-slate-500">No courses available yet.</p>
        )}
        {!loading && list.length > 0 && (
          <ul className="mt-2 grid gap-4 sm:grid-cols-2">
            {list.map((c) => (
              <li key={c.id} className="rounded-xl border p-4">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                {c.description && <p className="mt-1 text-sm text-slate-600 line-clamp-3">{c.description}</p>}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round((c.progress || 0) * 100)}%` }} />
                </div>
                <div className="mt-3 flex justify-end">
                  <button className="rounded border px-3 py-1 text-sm" onClick={() => openCourse(c.id)}>
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Courses
