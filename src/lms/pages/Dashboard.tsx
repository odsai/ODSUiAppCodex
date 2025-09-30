import React, { useEffect } from 'react'
import { useLmsStore } from '../store/lmsStore'
import { useAppStore, type Route } from '../../store/appStore'
import { getCourses } from '../api/courses'

const LmsDashboard = () => {
  const courses = useLmsStore((s) => s.courses)
  const limit = useLmsStore((s) => s.settings.recentCoursesLimit)

  const visible = courses.slice(0, limit)
  const setRoute = useAppStore((s) => s.setRoute)
  const setCourses = useLmsStore((s) => s.setCourses)
  const lms = useAppStore((s) => s.appSettings.lms)
  const token = useAppStore((s) => s.token)

  useEffect(() => {
    if (!lms.apiBaseUrl) return
    let cancelled = false
    getCourses({ apiBaseUrl: lms.apiBaseUrl, token }).then((list) => {
      if (!cancelled && list.length) setCourses(list)
    })
    return () => {
      cancelled = true
    }
  }, [lms.apiBaseUrl, setCourses, token])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Learning Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Track your active courses, upcoming lessons, and progress milestones.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Recent courses</h2>
        {visible.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No courses yet. Once you enroll, they’ll appear here.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {visible.map((course) => (
              <li key={course.id} className="rounded-xl border p-4">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                {course.description && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-3">{course.description}</p>
                )}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.round(course.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Last updated {new Date(course.updatedAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => {
                      const url = new URL(window.location.href)
                      url.hash = '/lms/course?id=' + encodeURIComponent(course.id)
                      window.location.href = url.toString()
                      setRoute('/lms/course' as Route)
                    }}
                  >
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex justify-end">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => setRoute('/lms/courses' as Route)}>
            Browse all courses
          </button>
        </div>
      </section>
    </div>
  )
}

export default LmsDashboard
