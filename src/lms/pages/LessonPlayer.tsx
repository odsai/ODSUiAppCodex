import React, { useEffect, useMemo, useState } from 'react'
import { useLmsStore } from '../store/lmsStore'
import type { LmsCourse, LmsLesson } from '../types'
import { getCourse } from '../api/courses'
import { upsertProgress, submitQuiz } from '../api/client'
import { useAppStore } from '../../store/appStore'
import { toast } from '../../store/toastStore'
import { SAMPLE_COURSE, SAMPLE_COURSE_MAP } from '../sampleData'

const LessonPlayer: React.FC = () => {
  const courseMap = useLmsStore((s) => s.courseMap)
  const setCourse = useLmsStore((s) => s.setCourse)
  const lms = useAppStore((s) => s.appSettings.lms)
  const token = useAppStore((s) => s.token)

  const params = useMemo(() => {
    const raw = (window.location.hash || '').replace(/^#/, '')
    const [, query = ''] = raw.split('?')
    const p = new URLSearchParams(query)
    return {
      courseId: p.get('course') || '',
      lessonId: p.get('lesson') || p.get('id') || '', // support legacy id
    }
  }, [])

  const [loading, setLoading] = useState(false)
  const [course, setLocalCourse] = useState<LmsCourse | null>(null)
  const [lesson, setLesson] = useState<LmsLesson | null>(null)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done'>('idle')
  const setRoute = useAppStore((s) => s.setRoute)

  useEffect(() => {
    let cancelled = false
    const resolvedCourseId = params.courseId || SAMPLE_COURSE.id
    const cached = courseMap[resolvedCourseId]
    const finish = (c: LmsCourse) => {
      if (cancelled) return
      setLocalCourse(c)
      const found = c.modules.flatMap((m) => m.lessons).find((l) => l.id === params.lessonId) || null
      setLesson(found)
    }
    if (cached) {
      finish(cached)
      return
    }
    const fallback = SAMPLE_COURSE_MAP[resolvedCourseId]
    if (fallback && !lms.apiBaseUrl) {
      finish(fallback)
      setCourse(fallback, resolvedCourseId)
      return
    }
    if (!lms.apiBaseUrl) {
      finish(SAMPLE_COURSE)
      setCourse(SAMPLE_COURSE, resolvedCourseId)
      return
    }
    setLoading(true)
    // Prefer fast fallback if API is slow/unreachable
    getCourse(resolvedCourseId, lms.apiBaseUrl, 800)
      .then((c) => {
        if (c) {
          setCourse(c, resolvedCourseId)
          finish(c)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [params.courseId, params.lessonId, courseMap, setCourse, lms.apiBaseUrl])

  // Post "in-progress" when a lesson becomes available
  useEffect(() => {
    if (!lesson || !course) return
    if (!lms.apiBaseUrl) return
    upsertProgress({
      baseUrl: lms.apiBaseUrl,
      token: token,
      courseId: course.id,
      lessonId: lesson.id,
      status: 'in-progress',
    }).catch(() => {/* swallow errors in UI */})
  }, [lesson, course, lms.apiBaseUrl, token])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading lesson…</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Lesson not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            {course && <p className="mt-2 text-slate-600">Course: {course.title}</p>}
          </div>
          {course && (
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                window.location.hash = `/lms/course?id=${encodeURIComponent(course.id)}`
              }}
            >
              Back to course
            </button>
          )}
        </div>
      </header>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        {lesson.type === 'video' && (
          <video controls className="aspect-video w-full rounded-xl bg-black">
            {lesson.videoUrl && <source src={lesson.videoUrl} />}
          </video>
        )}
        {lesson.type === 'reading' && (
          <article className="prose max-w-none">
            <p className="whitespace-pre-wrap">{lesson.body}</p>
          </article>
        )}
        {lesson.type === 'embed' && lesson.embedUrl && (
          <iframe
            title={lesson.title}
            src={lesson.embedUrl}
            className="h-[70vh] w-full rounded-xl border"
          />
        )}
        {lesson.type === 'quiz' && lesson.quiz && (
          Array.isArray((lesson as any).quiz?.questions) ? (
            <QuizMultiBlock
              questions={(lesson as any).quiz.questions as Array<{ id: string; text?: string; options: { id: string; text: string; correct?: boolean }[] }>}
              onSubmit={async (results) => {
                if (!course || !lesson) return
                const resp = await submitQuiz({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: lesson.id, questions: results })
                const passThreshold = (useAppStore.getState().appSettings.lms.rules?.passThreshold ?? 0.7)
                const status = resp?.status ?? ((results.filter(r => r.selected.length>0).length / results.length) >= passThreshold ? 'completed' : 'in-progress')
                toast[status === 'completed' ? 'success' : 'info'](status === 'completed' ? 'Quiz passed' : 'Recorded attempt')
                if (status === 'completed') {
                  window.dispatchEvent(new CustomEvent('lms:progress-changed', { detail: { courseId: course.id, lessonId: lesson.id, status: 'completed' } }))
                  setTimeout(() => { window.location.hash = `/lms/course?id=${encodeURIComponent(course.id)}`; setRoute('/lms/course' as unknown as import('../../store/appStore').Route) }, 250)
                }
              }}
            />
          ) : (
            <QuizBlock
              question={lesson.quiz.question}
              options={lesson.quiz.options}
              onSubmit={async (score, selected) => {
                if (!course || !lesson) return
                const resp = await submitQuiz({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: lesson.id, selected })
                // Fallback to client-computed if server unavailable
                const passThreshold = (useAppStore.getState().appSettings.lms.rules?.passThreshold ?? 0.7)
                const status = resp?.status ?? (score >= passThreshold ? 'completed' : 'in-progress')
                toast[status === 'completed' ? 'success' : 'info'](status === 'completed' ? 'Quiz passed' : 'Recorded attempt')
                if (status === 'completed') {
                  window.dispatchEvent(
                    new CustomEvent('lms:progress-changed', {
                      detail: { courseId: course.id, lessonId: lesson.id, status: 'completed' },
                    }),
                  )
                  setTimeout(() => {
                    window.location.hash = `/lms/course?id=${encodeURIComponent(course.id)}`
                    setRoute('/lms/course' as unknown as import('../../store/appStore').Route)
                  }, 250)
                }
              }}
            />
          )
        )}
        {lms.apiBaseUrl && (
          <div className="mt-6 flex justify-end">
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                if (!course || !lesson) return
                setSaved('saving')
                upsertProgress({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: lesson.id, status: 'completed' })
                  .then(() => {
                    window.dispatchEvent(
                      new CustomEvent('lms:progress-changed', {
                        detail: { courseId: course.id, lessonId: lesson.id, status: 'completed' },
                      }),
                    )
                    setSaved('done')
                    toast.success('Marked as completed')
                    // Navigate back to course to show updated badges
                    setTimeout(() => {
                      window.location.hash = `/lms/course?id=${encodeURIComponent(course.id)}`
                      setRoute('/lms/course' as unknown as import('../../store/appStore').Route)
                    }, 250)
                  })
                  .catch(() => {})
              }}
            >
              Mark as completed
            </button>
            {saved === 'saving' && <span className="ml-3 text-xs text-slate-500">Saving…</span>}
            {saved === 'done' && <span className="ml-3 text-xs text-green-600">Saved ✓</span>}
          </div>
        )}
      </section>
    </div>
  )
}

export default LessonPlayer

function QuizBlock({
  question,
  options,
  onSubmit,
}: {
  question: string
  options: { id: string; text: string; correct?: boolean }[]
  onSubmit: (score: number, selected: string[]) => void | Promise<void>
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }))
  const compute = () => {
    const correctIds = new Set(options.filter((o) => o.correct).map((o) => o.id))
    const selected = new Set(Object.keys(checked).filter((k) => checked[k]))
    const total = correctIds.size
    let ok = 0
    correctIds.forEach((id) => {
      if (selected.has(id)) ok += 1
    })
    const score = total > 0 ? ok / total : 1
    return score
  }
  return (
    <div>
      <p className="text-lg font-semibold">{question}</p>
      <ul className="mt-3 space-y-2">
        {options.map((o) => (
          <li key={o.id} className="rounded border p-3">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={!!checked[o.id]} onChange={() => toggle(o.id)} />
              {o.text}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={() => {
            const s = compute()
            const selected = Object.keys(checked).filter((k) => checked[k])
            void onSubmit(s, selected)
          }}
        >
          Submit answers
        </button>
        <p className="mt-2 text-xs text-slate-500">Sample quiz scoring: fraction of correct options selected.</p>
      </div>
    </div>
  )
}

function QuizMultiBlock({
  questions,
  onSubmit,
}: {
  questions: Array<{ id: string; text?: string; options: { id: string; text: string; correct?: boolean }[] }>
  onSubmit: (results: { id: string; selected: string[] }[]) => void | Promise<void>
}) {
  const [state, setState] = useState<Record<string, Record<string, boolean>>>({})
  const toggle = (qid: string, oid: string) => setState((s) => ({ ...s, [qid]: { ...(s[qid] ?? {}), [oid]: !(s[qid]?.[oid]) } }))
  const build = () => questions.map((q) => ({ id: q.id, selected: Object.entries(state[q.id] ?? {}).filter(([_, v]) => v).map(([k]) => k) }))
  return (
    <div>
      {questions.map((q) => (
        <div key={q.id} className="mb-4 rounded border p-3">
          {q.text && <p className="font-medium">{q.text}</p>}
          <ul className="mt-2 space-y-2">
            {q.options.map((o) => (
              <li key={o.id} className="rounded border p-2">
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={!!state[q.id]?.[o.id]} onChange={() => toggle(q.id, o.id)} />
                  {o.text}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button className="rounded border px-3 py-1 text-sm" onClick={() => void onSubmit(build())}>Submit answers</button>
      <p className="mt-2 text-xs text-slate-500">Exact match required per question.</p>
    </div>
  )
}
