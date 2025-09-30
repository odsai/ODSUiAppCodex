export type ProgressStatus = 'not-started' | 'in-progress' | 'completed'

export async function upsertProgress(options: {
  baseUrl?: string
  token?: string
  courseId: string
  lessonId: string
  status: ProgressStatus
  score?: number
  maxAttempts?: number
  retryDelayMs?: number
}) {
  const { baseUrl, token, courseId, lessonId, status, score, maxAttempts = 3, retryDelayMs = 250 } = options
  if (!baseUrl) return { skipped: true, ok: false, attempts: 0 }
  const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/progress`
  const body = JSON.stringify({ lessonId, status, ...(typeof score === 'number' ? { score } : {}) })

  let attempt = 0
  let lastStatus: number | undefined
  let lastError: string | undefined

  while (attempt < Math.max(1, maxAttempts)) {
    attempt += 1
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
        },
        body,
      })
      lastStatus = res.status
      if (res.ok) {
        return { ok: true, status: res.status, attempts: attempt }
      }
      if (res.status < 500) {
        return { ok: false, status: res.status, attempts: attempt }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
    }
  }

  return { ok: false, status: lastStatus, attempts: attempt, error: lastError }
}

export type ProgressRecord = {
  userId: string
  courseId: string
  lessonId: string
  status: ProgressStatus
  score?: number
  attempts?: number
  updatedAt?: string
  aiInteractions?: Array<{ sessionId?: string; workflowId?: string; summary?: string }>
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
    return (data as ProgressRecord[]).map((entry) => ({
      ...entry,
      aiInteractions: Array.isArray(entry.aiInteractions) ? entry.aiInteractions : undefined,
    }))
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
}): Promise<{ eligible: boolean; url: string | null; stored?: boolean } | null> {
  const { baseUrl, token, courseId } = options
  if (!baseUrl) return null
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/certificate`
    const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }) } })
    if (!res.ok) return null
    return (await res.json()) as { eligible: boolean; url: string | null; stored?: boolean }
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

export type TutorInvokeResult =
  | { ok: true; sessionId: string; message: string; workflowId?: string }
  | { ok: false; status?: number; error: string }

export async function invokeTutor(options: {
  baseUrl?: string
  token?: string
  courseId: string
  lessonId: string
  prompt: string
}): Promise<TutorInvokeResult> {
  const { baseUrl, token, courseId, lessonId, prompt } = options
  if (!baseUrl) return { ok: false, error: 'Tutor API unavailable' }
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/tutor`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: 'Bearer mock' }),
      },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text || 'Tutor request failed' }
    }
    const data = (await res.json()) as { sessionId?: string; message?: string; workflowId?: string }
    return {
      ok: true,
      sessionId: data.sessionId ?? 'unknown',
      message: data.message ?? '',
      workflowId: data.workflowId,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
