import React, { useEffect, useMemo, useState } from 'react'
import { useLmsStore } from '../store/lmsStore'
import type { LmsCourse, LmsLesson } from '../types'
import { getCourse } from '../api/courses'
import { upsertProgress } from '../api/client'
import { useAppStore } from '../../store/appStore'
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
          <div>
            <p className="text-lg font-semibold">{lesson.quiz.question}</p>
            <ul className="mt-3 space-y-2">
              {lesson.quiz.options.map((o) => (
                <li key={o.id} className="rounded border p-3">
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" />
                    {o.text}
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">Sample quiz for demonstration only.</p>
          </div>
        )}
        {lms.apiBaseUrl && (
          <div className="mt-6 flex justify-end">
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                if (!course || !lesson) return
                upsertProgress({ baseUrl: lms.apiBaseUrl, token, courseId: course.id, lessonId: lesson.id, status: 'completed' })
                  .catch(() => {})
              }}
            >
              Mark as completed
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default LessonPlayer
