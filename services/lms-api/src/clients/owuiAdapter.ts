import { getOwuiConfig } from '../config/index'
import { getOwuiRetryMax, getOwuiBreakerThreshold, getOwuiBreakerCooldownMs } from '../config/env'

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
  #retryMax: number
  #breakerThreshold: number
  #breakerCooldownMs: number
  #failCount = 0
  #openUntil = 0

  constructor() {
    const cfg = getOwuiConfig()
    this.#baseUrl = cfg.baseUrl.replace(/\/$/, '')
    this.#apiKey = cfg.apiKey
    this.#retryMax = getOwuiRetryMax()
    this.#breakerThreshold = getOwuiBreakerThreshold()
    this.#breakerCooldownMs = getOwuiBreakerCooldownMs()
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
    if (this.isBreakerOpen()) {
      const remaining = Math.max(0, this.#openUntil - Date.now())
      throw new Error(`OWUI breaker open; try after ${remaining}ms`)
    }

    const url = `${this.#baseUrl}/api/workflows/${encodeURIComponent(req.workflowId)}/invoke`

    let lastErr: unknown
    const baseDelay = 250
    for (let attempt = 1; attempt <= Math.max(1, this.#retryMax); attempt++) {
      try {
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
          const text = await res.text().catch(() => '')
          throw new Error(`OWUI tutor invocation failed: ${res.status} ${text}`)
        }
        const data = (await res.json()) as { sessionId?: string; reply?: string }
        // success: reset breaker
        this.#failCount = 0
        return { sessionId: data?.sessionId ?? 'unknown', reply: data?.reply ?? '' }
      } catch (err) {
        lastErr = err
        // failure, increment
        this.#failCount += 1
        if (this.#failCount >= this.#breakerThreshold) {
          this.#openUntil = Date.now() + this.#breakerCooldownMs
        }
        if (attempt < this.#retryMax) {
          const jitter = Math.floor(Math.random() * 100)
          const delay = attempt * baseDelay + jitter
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  #headers(extra?: Record<string, string>) {
    const headers: Record<string, string> = { ...extra }
    if (this.#apiKey) {
      headers.Authorization = `Bearer ${this.#apiKey}`
    }
    return headers
  }

  isBreakerOpen() {
    return Date.now() < this.#openUntil
  }

  breakerInfo() {
    return { open: this.isBreakerOpen(), cooldownMsRemaining: Math.max(0, this.#openUntil - Date.now()) }
  }
}
