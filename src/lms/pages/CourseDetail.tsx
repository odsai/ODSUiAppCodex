import React, { useEffect, useMemo, useState } from 'react'
import { useLmsStore } from '../store/lmsStore'
import { useAppStore, type Route } from '../../store/appStore'
import type { LmsCourse, LmsLesson } from '../types'
import { getCourse } from '../api/courses'
import { getProgress, getCertificate, unlockLessonAttempt } from '../api/client'
import { toast } from '../../store/toastStore'
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
  const [scores, setScores] = useState<Record<string, number>>({})
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const token = useAppStore((s) => s.token)
  const isAdmin = !!useAppStore((s) => s.user)?.roles?.includes('admin')

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
        const sc: Record<string, number> = {}
        const at: Record<string, number> = {}
        records.forEach((r) => {
          const prev = map[r.lessonId]
          if (r.status === 'completed' || prev !== 'completed') {
            map[r.lessonId] = r.status
          }
          if (typeof r.score === 'number') sc[r.lessonId] = r.score
          const rr = r as unknown as { attempts?: number }
          if (typeof rr.attempts === 'number') at[r.lessonId] = rr.attempts
        })
        setProgress(map)
        setScores(sc)
        setAttempts(at)
      })
      .catch(() => {})
  }, [course, lms.apiBaseUrl])

  // Listen for local progress updates from LessonPlayer and update badges optimistically
  useEffect(() => {
    const onProgress = (e: Event) => {
      const ev = e as CustomEvent<{ courseId: string; lessonId: string; status: 'in-progress' | 'completed' }>
      if (!course || !ev.detail) return
      if (ev.detail.courseId !== course.id) return
      setProgress((prev) => ({ ...prev, [ev.detail.lessonId]: ev.detail.status }))
    }
    window.addEventListener('lms:progress-changed', onProgress as EventListener)
    return () => window.removeEventListener('lms:progress-changed', onProgress as EventListener)
  }, [course])

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
        {(() => {
          // Course completion banner
          const allLessons = course.modules.flatMap((m) => m.lessons)
          const done = allLessons.length > 0 && allLessons.every((l) => progress[l.id] === 'completed')
          if (!done) return null
          return (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <span>Course completed. You can review lessons any time.</span>
              {lms.apiBaseUrl && (
                <button
                  className="rounded border border-green-300 px-3 py-1 text-xs text-green-700 hover:bg-green-100"
                  onClick={async () => {
                    const cert = await getCertificate({ baseUrl: lms.apiBaseUrl, courseId: course.id })
                    if (!cert) { toast.error('Could not check certificate'); return }
                    if (!cert.eligible) { toast.info('Not eligible for certificate yet'); return }
                    if (cert.url) { window.open(cert.url, '_blank'); return }
                    toast.success('Certificate generation coming soon')
                  }}
                >
                  Get certificate
                </button>
              )}
            </div>
          )
        })()}
        {isAdmin && lms.apiBaseUrl && (
          <div className="mt-3">
            <button
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm('Reset progress for this course?')) return
                const base = lms.apiBaseUrl
                try {
                  const ok = await (async () => {
                    const url = `${base!.replace(/\/$/, '')}/courses/${encodeURIComponent(course.id)}/progress`
                    const res = await fetch(url, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }) } })
                    return res.ok
                  })()
                  if (ok) {
                    setProgress({})
                    toast.success('Progress reset')
                  } else {
                    toast.error('Failed to reset progress')
                  }
                } catch {
                  toast.error('Failed to reset progress')
                }
              }}
            >
              Reset progress (admin)
            </button>
          </div>
        )}
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
                    // Sequential gating (previous lesson must be completed)
                    const state = useAppStore.getState()
                    const features = state.appSettings.lms.features || {}
                    const rules = state.appSettings.lms.rules || { passThreshold: 0.7, maxQuizAttempts: 3 }
                    const sequential = !!features.sequential
                    const requireQuizPass = !!features.requireQuizPass
                    const linear = course.modules.flatMap((mm) => mm.lessons.map((ll) => ll.id))
                    const pos = linear.indexOf(l.id)
                    let prevOk = true
                    if (pos > 0) {
                      const prevId = linear[pos - 1]
                      prevOk = progress[prevId] === 'completed'
                      if (prevOk && requireQuizPass) {
                        // If previous lesson is a quiz, require pass score (>= 0.7). We don't have scores stored locally yet, so keep simple gate on completion for now.
                        const prevLesson = course.modules.flatMap((mm) => mm.lessons).find((ll) => ll.id === prevId)
                        if (prevLesson?.type === 'quiz') {
                          const s = scores[prevId]
                          prevOk = typeof s === 'number' ? s >= rules.passThreshold : prevOk
                        }
                      }
                    }
                    // Module-level prereqs: require previous module completion by default
                    const moduleIndex = course.modules.findIndex((mm) => mm.lessons.some((ll) => ll.id === l.id))
                    let moduleOk = true
                    if (moduleIndex > 0) {
                      const prevModuleLessons = course.modules[moduleIndex - 1].lessons
                      moduleOk = prevModuleLessons.every((ll) => {
                        const st2 = progress[ll.id]
                        if (!requireQuizPass) return st2 === 'completed'
                        if (ll.type !== 'quiz') return st2 === 'completed'
                        const s2 = scores[ll.id]
                        return st2 === 'completed' && typeof s2 === 'number' && s2 >= rules.passThreshold
                      })
                    }
                    // Attempts lock for quiz lessons
                    const maxAttempts = rules.maxQuizAttempts ?? 3
                    const currentAttempts = attempts[l.id] ?? 0
                    const attemptsLock = l.type === 'quiz' && progress[l.id] !== 'completed' && currentAttempts >= maxAttempts
                    const locked = (sequential && !prevOk) || (features.modulePrereqs !== false && !moduleOk) || attemptsLock
                    return (
                      <li key={l.id} className="flex items-center justify-between rounded border p-3">
                        <div>
                          <p className="font-medium">{l.title}</p>
                          <p className="text-xs uppercase text-slate-500">{l.type}</p>
                          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${badge}`}>{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {attemptsLock && isAdmin && lms.apiBaseUrl && (
                            <button
                              className="rounded border border-amber-300 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50"
                              onClick={async () => {
                                const ok = await unlockLessonAttempt({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: l.id })
                                if (ok) {
                                  toast.success('Attempts unlocked')
                                  const recs = await getProgress({ baseUrl: lms.apiBaseUrl, courseId: course.id })
                                  if (recs) {
                                    const at2: Record<string, number> = {}
                                    recs.forEach((r) => { const rr = r as unknown as { attempts?: number }; if (typeof rr.attempts === 'number') at2[r.lessonId] = rr.attempts })
                                    setAttempts(at2)
                                  }
                                } else {
                                  toast.error('Failed to unlock attempts')
                                }
                              }}
                            >
                              Unlock
                            </button>
                          )}
                          <button
                            className={`rounded border px-3 py-1 text-sm ${locked ? 'opacity-50' : ''}`}
                            disabled={locked}
                            onClick={() => {
                              if (st === 'completed') {
                                toast.info('Already completed — opening for review')
                              }
                              const url = new URL(window.location.href)
                              url.hash = `/lms/lesson?course=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(l.id)}`
                              window.location.href = url.toString()
                              setRoute('/lms/lesson' as Route)
                            }}
                          >
                            {st === 'completed' ? 'Review' : locked ? 'Locked' : 'Open'}
                          </button>
                        </div>
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
