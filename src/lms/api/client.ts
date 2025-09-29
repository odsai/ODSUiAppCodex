export type ProgressStatus = 'not-started' | 'in-progress' | 'completed'

export async function upsertProgress(options: {
  baseUrl?: string
  token?: string
  courseId: string
  lessonId: string
  status: ProgressStatus
}) {
  const { baseUrl, token, courseId, lessonId, status } = options
  if (!baseUrl) return { skipped: true }
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/progress`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
    },
    body: JSON.stringify({ lessonId, status }),
  })
  return { ok: res.ok, status: res.status }
}

export type ProgressRecord = {
  userId: string
  courseId: string
  lessonId: string
  status: ProgressStatus
  score?: number
  updatedAt?: string
}

export async function getProgress(options: {
  baseUrl?: string
  token?: string
  courseId: string
}): Promise<ProgressRecord[] | null> {
  const { baseUrl, token, courseId } = options
  if (!baseUrl) return null
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/progress`
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return null
    return data as ProgressRecord[]
  } catch {
    return null
  }
}
