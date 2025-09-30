import type { LmsCourseSummary, LmsCourse } from '../types'
import {
  SAMPLE_COURSE,
  SAMPLE_COURSE_MAP,
  SAMPLE_COURSE_SUMMARIES,
} from '../sampleData'

type ApiCourse = {
  id?: string | number
  title?: string
  description?: string
  progress?: number | string
  updatedAt?: string
}

type CourseRequestBase = {
  apiBaseUrl?: string
  token?: string
  timeoutMs?: number
}

export async function getCourses(options: CourseRequestBase = {}): Promise<LmsCourseSummary[]> {
  const { apiBaseUrl, token, timeoutMs = 2500 } = options
  if (!apiBaseUrl) return SAMPLE_COURSE_SUMMARIES
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/courses`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as unknown
    if (Array.isArray(data)) {
      return (data as ApiCourse[])
        .map((c) => ({
          id: String(c.id ?? ''),
          title: String(c.title ?? 'Course'),
          description: typeof c.description === 'string' ? c.description : undefined,
          progress:
            typeof c.progress === 'string'
              ? Number(c.progress) || 0
              : Number(c.progress ?? 0) || 0,
          updatedAt: String(c.updatedAt ?? new Date().toISOString()),
        }))
        .filter((c) => c.id && c.title)
    }
  } catch {
    // fall through to mock if API unavailable/slow
  }
  return SAMPLE_COURSE_SUMMARIES
}

type GetCourseOptions = CourseRequestBase & { id: string }

export async function getCourse(options: GetCourseOptions): Promise<LmsCourse | null> {
  const { id, apiBaseUrl, token, timeoutMs = 2500 } = options
  if (!apiBaseUrl) return SAMPLE_COURSE_MAP[id] ?? SAMPLE_COURSE
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(id)}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as LmsCourse
  } catch {
    return SAMPLE_COURSE_MAP[id] ?? SAMPLE_COURSE
  }
}

export { SAMPLE_COURSE }
