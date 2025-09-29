import { getOwuiConfig } from '../config/index'

export type OwuiMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type TutorRequest = {
  workflowId: string
  lessonContext: string
  prompt: string
  userId: string
}

export type TutorResponse = {
  sessionId: string
  reply: string
}

export class OwuiAdapter {
  #baseUrl: string
  #apiKey?: string

  constructor() {
    const cfg = getOwuiConfig()
    this.#baseUrl = cfg.baseUrl.replace(/\/$/, '')
    this.#apiKey = cfg.apiKey
  }

  async health() {
    const url = `${this.#baseUrl}/api/health`
    const res = await fetch(url, {
      headers: this.#headers(),
      method: 'GET',
    })
    if (!res.ok) {
      throw new Error(`OWUI health check failed: ${res.status}`)
    }
    return res.json().catch(() => ({ status: 'ok' }))
  }

  async invokeTutor(req: TutorRequest): Promise<TutorResponse> {
    const url = `${this.#baseUrl}/api/workflows/${encodeURIComponent(req.workflowId)}/invoke`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.#headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        prompt: req.prompt,
        metadata: {
          lessonContext: req.lessonContext,
          userId: req.userId,
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OWUI tutor invocation failed: ${res.status} ${text}`)
    }

    const data = await res.json()
    return {
      sessionId: data.sessionId ?? 'unknown',
      reply: data.reply ?? '',
    }
  }

  #headers(extra?: Record<string, string>) {
    const headers: Record<string, string> = { ...extra }
    if (this.#apiKey) {
      headers.Authorization = `Bearer ${this.#apiKey}`
    }
    return headers
  }
}
