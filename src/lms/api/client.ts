export type ProgressStatus = 'not-started' | 'in-progress' | 'completed'

export async function upsertProgress(options: {
  baseUrl?: string
  token?: string
  courseId: string
  lessonId: string
  status: ProgressStatus
  score?: number
}) {
  const { baseUrl, token, courseId, lessonId, status, score } = options
  if (!baseUrl) return { skipped: true }
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/progress`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
    },
    body: JSON.stringify({ lessonId, status, ...(typeof score === 'number' ? { score } : {}) }),
  })
  return { ok: res.ok, status: res.status }
}

export type ProgressRecord = {
  userId: string
  courseId: string
  lessonId: string
  status: ProgressStatus
  score?: number
  attempts?: number
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

export async function resetProgress(options: {
  baseUrl?: string
  token?: string
  courseId: string
}): Promise<boolean> {
  const { baseUrl, token, courseId } = options
  if (!baseUrl) return false
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/progress`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
    },
  })
  return res.ok
}

export async function getCertificate(options: {
  baseUrl?: string
  token?: string
  courseId: string
}): Promise<{ eligible: boolean; url: string | null } | null> {
  const { baseUrl, token, courseId } = options
  if (!baseUrl) return null
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/certificate`
    const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }) } })
    if (!res.ok) return null
    return (await res.json()) as { eligible: boolean; url: string | null }
  } catch {
    return null
  }
}

export async function unlockLessonAttempt(options: {
  baseUrl?: string
  token?: string
  courseId: string
  lessonId: string
}): Promise<boolean> {
  const { baseUrl, token, courseId, lessonId } = options
  if (!baseUrl) return false
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/attempts`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }) },
  })
  return res.ok
}

export async function submitQuiz(options: {
  baseUrl?: string
  token?: string
  courseId: string
  lessonId: string
  selected?: string[]
  questions?: { id: string; selected: string[] }[]
}): Promise<{ score: number; passed: boolean; status: ProgressStatus } | null> {
  const { baseUrl, token, courseId, lessonId, selected, questions } = options
  if (!baseUrl) return null
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/quiz`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }) },
      body: JSON.stringify(questions ? { questions } : { selected: selected ?? [] }),
    })
    if (!res.ok) return null
    return (await res.json()) as { score: number; passed: boolean; status: ProgressStatus }
  } catch {
    return null
  }
}
