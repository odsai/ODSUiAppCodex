import type { ProgressRecord } from './client'

type BaseOpts = {
  baseUrl?: string
  token?: string
}

const authHeaders = (token?: string) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
})

export async function fetchCourseDetail(opts: BaseOpts & { courseId: string }) {
  const { baseUrl, token, courseId } = opts
  if (!baseUrl) return null
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) return null
  return res.json()
}

export async function patchCourseSettings(opts: BaseOpts & { courseId: string; settings: { modulePrereqs?: boolean } }) {
  const { baseUrl, token, courseId, settings } = opts
  if (!baseUrl) throw new Error('No API base URL')
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/settings`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error('Failed to update course settings')
  return res.json()
}

export async function patchLessonWorkflow(opts: BaseOpts & { courseId: string; lessonId: string; workflowRef?: string }) {
  const { baseUrl, token, courseId, lessonId, workflowRef } = opts
  if (!baseUrl) throw new Error('No API base URL')
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/owui`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ workflowRef }),
  })
  if (!res.ok) throw new Error('Failed to update workflow reference')
  return res.json()
}

export async function fetchAllProgress(opts: BaseOpts & { courseId: string }): Promise<ProgressRecord[] | null> {
  const { baseUrl, token, courseId } = opts
  if (!baseUrl) return null
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/progress/all`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) return null
  return res.json()
}
