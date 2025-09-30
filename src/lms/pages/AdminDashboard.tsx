import React, { useEffect, useMemo, useState } from 'react'
import { useAppStore, type Route } from '../../store/appStore'
import { fetchCourseDetail, fetchAllProgress, patchCourseSettings, patchLessonWorkflow } from '../api/admin'

type LessonSummary = {
  id: string
  title: string
  type: string
  payload?: Record<string, unknown>
}

type CourseDetail = {
  id: string
  title: string
  modules: Array<{ id: string; title: string; lessons: LessonSummary[] }>
  settings?: { modulePrereqs?: boolean }
}

const AdminDashboard: React.FC = () => {
  const [courseId, setCourseId] = useState<string>('')
  const lms = useAppStore((s) => s.appSettings.lms)
  const token = useAppStore((s) => s.token)
  const setRoute = useAppStore((s) => s.setRoute)

  useEffect(() => {
    const firstCourse = useAppStore.getState().courses?.[0]?.id ?? ''
    setCourseId((current) => current || firstCourse)
  }, [])

  const [loading, setLoading] = useState(false)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  type ProgressCell = {
    userId: string
    attempts: number
    status: string
    score?: number
    aiInteractions?: Array<{ sessionId?: string; workflowId?: string; summary?: string }>
    updatedAt?: string
  }

  const [progress, setProgress] = useState<Record<string, ProgressCell>>({})
  const [activeLogKey, setActiveLogKey] = useState<string | null>(null)
  const isAdmin = useAppStore((s) => s.user)?.roles?.includes('admin')

  useEffect(() => {
    if (!courseId || !lms.apiBaseUrl) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [detail, all] = await Promise.all([
          fetchCourseDetail({ baseUrl: lms.apiBaseUrl, token, courseId }),
          fetchAllProgress({ baseUrl: lms.apiBaseUrl, token, courseId }),
        ])
        if (!cancelled) {
          setCourse(detail)
          if (Array.isArray(all)) {
            const map: Record<string, ProgressCell> = {}
            all.forEach((rec) => {
              const key = `${rec.userId}:${rec.lessonId}`
              map[key] = {
                userId: rec.userId,
                attempts: rec.attempts ?? 0,
                status: rec.status,
                score: rec.score,
                aiInteractions: Array.isArray(rec.aiInteractions) ? rec.aiInteractions : undefined,
                updatedAt: rec.updatedAt,
              }
            })
            setProgress(map)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [courseId, lms.apiBaseUrl, token])

  const handleToggleModulePrereqs = async () => {
    if (!course || !courseId || !lms.apiBaseUrl) return
    const next = !course.settings?.modulePrereqs
    const updated = await patchCourseSettings({ baseUrl: lms.apiBaseUrl, token, courseId, settings: { modulePrereqs: next } })
    setCourse(updated)
  }

  const lessons = useMemo(() => {
    if (!course) return []
    return course.modules.flatMap((mod) =>
      mod.lessons.map((lesson) => ({ ...lesson, moduleTitle: mod.title }))
    )
  }, [course])

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Admin access required.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Instructor Console</h1>
        <select
          className="rounded border px-3 py-2"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {useAppStore.getState().courses?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </header>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {course && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Course Settings</h2>
                <p className="text-sm text-slate-500">Override per-course rules.</p>
              </div>
              <button
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                onClick={handleToggleModulePrereqs}
              >
                Module prerequisites: {course.settings?.modulePrereqs !== false ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow">
            <h2 className="text-lg font-semibold">Lessons</h2>
            <table className="mt-3 w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="w-1/4">Module</th>
                  <th className="w-1/4">Lesson</th>
                  <th className="w-1/6">Type</th>
                  <th className="w-1/6">Workflow</th>
                  <th className="w-1/6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => {
                  const scoped = Object.entries(progress)
                    .filter(([key]) => key.endsWith(`:${lesson.id}`))
                    .map(([, value]) => value)
                  const firstProgress = scoped[0]
                  const payload = lesson.payload ?? {}
                  const workflow = typeof (payload as { owuiWorkflowRef?: unknown }).owuiWorkflowRef === 'string'
                    ? (payload as { owuiWorkflowRef: string }).owuiWorkflowRef
                    : undefined
                  const hasTutorLog = scoped.some((item) => (item.aiInteractions?.length ?? 0) > 0)
                  return (
                    <React.Fragment key={lesson.id}>
                      <tr className="border-t">
                        <td className="truncate py-2 pr-3">{lesson.moduleTitle}</td>
                        <td className="truncate py-2 pr-3">{lesson.title || lesson.id}</td>
                        <td className="py-2 pr-3 text-slate-600">{lesson.type}</td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-full rounded border px-2 py-1 text-xs"
                            value={workflow || ''}
                            placeholder="workflowRef"
                            onChange={async (e) => {
                              if (!courseId || !lms.apiBaseUrl) return
                              await patchLessonWorkflow({ baseUrl: lms.apiBaseUrl, token, courseId, lessonId: lesson.id, workflowRef: e.target.value || undefined })
                            }}
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() => {
                                window.location.hash = `/lms/lesson?course=${courseId}&lesson=${lesson.id}`
                                setRoute('/lms/lesson' as Route)
                              }}
                            >
                              Preview
                            </button>
                            {lesson.type === 'quiz' && firstProgress && (
                              <span className="text-xs text-slate-500">
                                Attempts: {firstProgress.attempts ?? 0} {typeof firstProgress.score === 'number' ? `| Score: ${(firstProgress.score * 100).toFixed(0)}%` : ''}
                              </span>
                            )}
                            {hasTutorLog && (
                              <button
                                className="rounded border px-2 py-1 text-xs text-brand hover:underline"
                                onClick={() => {
                                  const toggleKey = lesson.id
                                  setActiveLogKey((prev) => (prev === toggleKey ? null : toggleKey))
                                }}
                              >
                                {activeLogKey === lesson.id ? 'Hide tutor log' : 'View tutor log'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {hasTutorLog && activeLogKey === lesson.id && (
                        <tr className="border-t bg-slate-50">
                          <td colSpan={5} className="p-4 text-sm">
                            <div className="space-y-4">
                              {scoped.map((item) => (
                                <div key={`${lesson.id}-${item.userId}`} className="rounded border border-slate-200 bg-white p-3">
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>User: {item.userId}</span>
                                    <span>Attempts: {item.attempts ?? 0}</span>
                                  </div>
                                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                                    {(item.aiInteractions ?? []).map((entry, idx) => (
                                      <li key={`${entry.sessionId ?? idx}-${idx}`} className="rounded border border-slate-100 bg-slate-50 p-2">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                          <span>Session: {entry.sessionId ?? 'n/a'}</span>
                                          <span>Workflow: {entry.workflowId ?? '—'}</span>
                                        </div>
                                        {entry.summary && <p className="mt-2 whitespace-pre-wrap">{entry.summary}</p>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
