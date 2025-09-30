import React, { useEffect, useMemo, useState } from 'react'
import { useLmsStore } from '../store/lmsStore'
import type { LmsCourse, LmsLesson, LmsQuizOption, LmsQuizQuestion } from '../types'
import { getCourse } from '../api/courses'
import { upsertProgress, submitQuiz, getProgress, invokeTutor, type TutorInvokeResult } from '../api/client'
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
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sessionId?: string }>>([])
  const [tutorState, setTutorState] = useState<'idle' | 'loading' | 'sending'>('idle')
  const [tutorError, setTutorError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [breakerInfo, setBreakerInfo] = useState<{ open?: boolean; cooldownMsRemaining?: number } | null>(null)
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
    getCourse({ id: resolvedCourseId, apiBaseUrl: lms.apiBaseUrl, token, timeoutMs: 800 })
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
  }, [params.courseId, params.lessonId, courseMap, setCourse, lms.apiBaseUrl, token])

  const workflowRef = useMemo(() => {
    if (!lesson) return undefined
    return (
      lesson.owuiWorkflowRef ||
      (typeof lesson.payload === 'object' ? (lesson.payload as Record<string, unknown>).owuiWorkflowRef : undefined)
    ) as string | undefined
  }, [lesson])

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

  // Load historic tutor interactions to seed the conversation panel
  useEffect(() => {
    if (!lesson || !course || !lms.apiBaseUrl || !workflowRef) {
      setTutorMessages([])
      return
    }
    setTutorState('loading')
    getProgress({ baseUrl: lms.apiBaseUrl, token, courseId: course.id })
      .then((records) => {
        if (!records) return
        const current = records.find((r) => r.lessonId === lesson.id)
        if (!current?.aiInteractions?.length) {
          setTutorMessages([])
          return
        }
        const seeded = current.aiInteractions
          .filter((entry) => entry.summary)
          .map((entry) => ({
            role: 'assistant' as const,
            content: entry.summary ?? '',
            sessionId: entry.sessionId,
          }))
        setTutorMessages(seeded)
      })
      .finally(() => setTutorState('idle'))
  }, [lesson, course, lms.apiBaseUrl, token, workflowRef])

  const handleTutorSubmit = async () => {
    if (!course || !lesson || !lms.apiBaseUrl || !workflowRef) return
    const trimmed = prompt.trim()
    if (!trimmed) {
      toast.info('Enter a question for the tutor')
      return
    }
    setTutorError(null)
    setTutorMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setTutorState('sending')
    const result: TutorInvokeResult = await invokeTutor({
      baseUrl: lms.apiBaseUrl,
      token,
      courseId: course.id,
      lessonId: lesson.id,
      prompt: trimmed,
    })
    if (!result.ok) {
      const msg = result.error || 'Tutor is unavailable right now.'
      setTutorError(msg)
      toast.error(msg)
      if (result.status === 503) {
        setBreakerInfo({ open: true })
      }
      setTutorState('idle')
      return
    }
    setBreakerInfo(null)
    setTutorMessages((prev) => [
      ...prev,
      { role: 'assistant', content: result.message, sessionId: result.sessionId },
    ])
    setPrompt('')
    setTutorState('idle')
  }

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
          isMultiQuiz(lesson.quiz) ? (
            <QuizMultiBlock
              questions={lesson.quiz.questions}
              onSubmit={async ({ score: clientScore, questions }) => {
                if (!course || !lesson) return
                const resp = await submitQuiz({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: lesson.id, questions })
                const passThreshold = useAppStore.getState().appSettings.lms.rules?.passThreshold ?? 0.7
                const status = resp?.status ?? (clientScore >= passThreshold ? 'completed' : 'in-progress')
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
          ) : isSingleQuiz(lesson.quiz) ? (
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
          ) : null
        )}
        {workflowRef && (
          <TutorPanel
            disabled={tutorState === 'sending'}
            loading={tutorState === 'loading'}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleTutorSubmit}
            messages={tutorMessages}
            error={tutorError}
            owuiBaseUrl={lms.owuiWorkflowBaseUrl}
            workflowRef={workflowRef}
            breakerInfo={breakerInfo}
          />
        )}
        {lms.apiBaseUrl && (
          <div className="mt-6 flex justify-end">
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                if (!course || !lesson) return
                setSaved('saving')
                upsertProgress({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: lesson.id, status: 'completed' })
                  .then((result) => {
                    if (!result?.ok) {
                      setSaved('idle')
                      toast.error('Could not mark lesson as completed. Try again shortly.')
                      return
                    }
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
                  .catch(() => {
                    setSaved('idle')
                    toast.error('Could not mark lesson as completed. Check your connection and retry.')
                  })
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

type TutorPanelProps = {
  prompt: string
  onPromptChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  loading?: boolean
  messages: Array<{ role: 'user' | 'assistant'; content: string; sessionId?: string }>
  error: string | null
  owuiBaseUrl?: string
  workflowRef: string
  breakerInfo?: { open?: boolean; cooldownMsRemaining?: number } | null
}

const TutorPanel: React.FC<TutorPanelProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  disabled,
  loading,
  messages,
  error,
  owuiBaseUrl,
  workflowRef,
  breakerInfo,
}) => {
  return (
    <aside className="mt-6 rounded-2xl border bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">AI Tutor</h2>
          <p className="text-sm text-slate-600">Ask follow-up questions or clarify tricky steps.</p>
          {breakerInfo?.open && (
            <p className="mt-2 text-xs text-amber-600">
              Tutor cooling down. Try again in {Math.max(1, Math.round((breakerInfo.cooldownMsRemaining ?? 0) / 1000))}s.
            </p>
          )}
        </div>
        {owuiBaseUrl && (
          <a
            className="text-sm text-brand hover:underline"
            href={`${owuiBaseUrl.replace(/\/$/, '')}/workflows/${encodeURIComponent(workflowRef)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in OWUI ↗
          </a>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {loading && <p className="text-xs text-slate-500">Loading previous tutor interactions…</p>}
        {messages.length === 0 && !loading && (
          <p className="text-sm text-slate-500">No tutor conversations yet. Ask the first question to get started.</p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}-${msg.sessionId ?? 'local'}`}
            className={`rounded-lg p-3 text-sm ${msg.role === 'assistant' ? 'bg-white text-slate-700 shadow-sm' : 'bg-brand text-white'}`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium text-slate-600" htmlFor="tutorPrompt">
          Ask the tutor
        </label>
        <textarea
          id="tutorPrompt"
          className="h-24 w-full rounded border px-3 py-2 text-sm"
          value={prompt}
          disabled={disabled}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="E.g. Can you explain this concept in simpler terms?"
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{prompt.trim().length} characters</span>
          <button
            className="rounded border border-brand px-3 py-1 text-sm text-brand hover:brightness-95"
            disabled={disabled}
            onClick={onSubmit}
          >
            {disabled ? 'Sending…' : 'Send to tutor'}
          </button>
        </div>
      </div>
    </aside>
  )
}

function QuizBlock({
  question,
  options,
  onSubmit,
}: {
  question: string
  options: LmsQuizOption[]
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

const isSingleQuiz = (quiz: LmsLesson['quiz']): quiz is { question: string; options: LmsQuizOption[] } =>
  typeof quiz?.question === 'string' && Array.isArray(quiz?.options)

const isMultiQuiz = (quiz: LmsLesson['quiz']): quiz is { questions: LmsQuizQuestion[] } =>
  Array.isArray(quiz?.questions) && quiz.questions.length > 0

function QuizMultiBlock({
  questions,
  onSubmit,
}: {
  questions: LmsQuizQuestion[]
  onSubmit: (payload: { score: number; questions: { id: string; selected: string[] }[] }) => void | Promise<void>
}) {
  const [state, setState] = useState<Record<string, Record<string, boolean>>>({})
  const toggle = (qid: string, oid: string) => setState((s) => ({ ...s, [qid]: { ...(s[qid] ?? {}), [oid]: !(s[qid]?.[oid]) } }))
  const build = () =>
    questions.map((q) => ({
      id: q.id,
      selected: Object.entries(state[q.id] ?? {})
        .filter(([, isSelected]) => isSelected)
        .map(([optionId]) => optionId),
    }))
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
      <button
        className="rounded border px-3 py-1 text-sm"
        onClick={() => {
          const results = build()
          const total = questions.length || 1
          let correctCount = 0
          questions.forEach((q) => {
            const correctIds = new Set(q.options.filter((o) => o.correct).map((o) => o.id))
            const selection = new Set(results.find((r) => r.id === q.id)?.selected ?? [])
            if (correctIds.size === selection.size && [...correctIds].every((id) => selection.has(id))) correctCount += 1
          })
          const score = correctCount / total
          void onSubmit({ score, questions: results })
        }}
      >
        Submit answers
      </button>
      <p className="mt-2 text-xs text-slate-500">Exact match required per question.</p>
    </div>
  )
}
