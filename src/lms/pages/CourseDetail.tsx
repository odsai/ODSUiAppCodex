import React, { useEffect, useMemo, useState } from 'react'
import { useLmsStore } from '../store/lmsStore'
import { useAppStore, type Route } from '../../store/appStore'
import type { LmsCourse, LmsLesson } from '../types'
import { getCourse } from '../api/courses'
import { getProgress } from '../api/client'
import { SAMPLE_COURSE, SAMPLE_COURSE_MAP } from '../sampleData'

const CourseDetail: React.FC = () => {
  const courseMap = useLmsStore((s) => s.courseMap)
  const setCourse = useLmsStore((s) => s.setCourse)
  const setRoute = useAppStore((s) => s.setRoute)
  const lms = useAppStore((s) => s.appSettings.lms)

  const courseId = useMemo(() => {
    const raw = (window.location.hash || '').replace(/^#/, '')
    const [, query = ''] = raw.split('?')
    return new URLSearchParams(query).get('id') || ''
  }, [])

  const [loading, setLoading] = useState(false)
  const [course, setLocalCourse] = useState<LmsCourse | null>(null)
  const [progress, setProgress] = useState<Record<string, 'in-progress' | 'completed'>>({})

  useEffect(() => {
    let cancelled = false
    const resolvedId = courseId || SAMPLE_COURSE.id
    const cached = courseMap[resolvedId]
    if (cached) {
      setLocalCourse(cached)
      return
    }
    const fallback = SAMPLE_COURSE_MAP[resolvedId]
    if (fallback && !lms.apiBaseUrl) {
      setLocalCourse(fallback)
      setCourse(fallback, resolvedId)
      return
    }
    if (!lms.apiBaseUrl) {
      setLocalCourse(SAMPLE_COURSE)
      setCourse(SAMPLE_COURSE, resolvedId)
      return
    }
    setLoading(true)
    // Prefer fast fallback if API is slow/unreachable
    getCourse(resolvedId, lms.apiBaseUrl, 800)
      .then((c) => {
        if (!cancelled && c) {
          setLocalCourse(c)
          setCourse(c, resolvedId)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [courseId, courseMap, setCourse, lms.apiBaseUrl])

  useEffect(() => {
    if (!course || !lms.apiBaseUrl) return
    getProgress({ baseUrl: lms.apiBaseUrl, courseId: course.id })
      .then((records) => {
        if (!records) return
        const map: Record<string, 'in-progress' | 'completed'> = {}
        records.forEach((r) => {
          const prev = map[r.lessonId]
          if (r.status === 'completed' || prev !== 'completed') {
            map[r.lessonId] = r.status
          }
        })
        setProgress(map)
      })
      .catch(() => {})
  }, [course, lms.apiBaseUrl])

  const startLesson = () => {
    const resolvedId = courseId || SAMPLE_COURSE.id
    const firstLesson = course?.modules.flatMap((m) => m.lessons)[0]
    if (!firstLesson) return
    const url = new URL(window.location.href)
    url.hash = `/lms/lesson?course=${encodeURIComponent(resolvedId)}&lesson=${encodeURIComponent(firstLesson.id)}`
    window.location.href = url.toString()
    setRoute('/lms/lesson' as Route)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading course…</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Course not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <button
            className="rounded border px-3 py-1 text-sm"
            onClick={() => {
              window.location.hash = '/lms/courses'
              setRoute('/lms/courses' as Route)
            }}
          >
            Back to courses
          </button>
        </div>
        {course.description && <p className="mt-2 text-slate-600">{course.description}</p>}
      </header>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {course.modules.length === 0 ? (
          <p className="text-sm text-slate-600">No modules yet.</p>
        ) : (
          <div className="space-y-4">
            {course.modules.map((m) => (
              <div key={m.id} className="rounded-xl border p-4">
                <h3 className="text-lg font-semibold">{m.title}</h3>
                <ul className="mt-3 space-y-2">
                  {m.lessons.map((l: LmsLesson) => {
                    const st = progress[l.id]
                    const badge = st === 'completed' ? 'bg-green-100 text-green-700' : st === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    const label = st === 'completed' ? 'Completed' : st === 'in-progress' ? 'In progress' : 'Not started'
                    return (
                      <li key={l.id} className="flex items-center justify-between rounded border p-3">
                        <div>
                          <p className="font-medium">{l.title}</p>
                          <p className="text-xs uppercase text-slate-500">{l.type}</p>
                          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${badge}`}>{label}</span>
                        </div>
                        <button
                          className="rounded border px-3 py-1 text-sm"
                          onClick={() => {
                            const url = new URL(window.location.href)
                            url.hash = `/lms/lesson?course=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(l.id)}`
                            window.location.href = url.toString()
                            setRoute('/lms/lesson' as Route)
                          }}
                        >
                          Open
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button className="rounded bg-brand px-4 py-2 text-white" onClick={startLesson}>
            Start first lesson
          </button>
        </div>
      </section>
    </div>
  )
}

export default CourseDetail
