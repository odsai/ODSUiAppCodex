export function getPassThreshold(): number {
  const raw = process.env.PASS_THRESHOLD
  const n = raw ? Number(raw) : NaN
  if (!Number.isFinite(n)) return 0.7
  return Math.min(1, Math.max(0, n))
}

export function getMaxQuizAttempts(): number {
  const raw = process.env.MAX_QUIZ_ATTEMPTS
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(n)) return 3
  return Math.max(1, n)
}

export function getCertificateStorageDir(): string | null {
  return process.env.CERT_STORAGE_DIR ?? null
}

export function getOwuiRetryMax(): number {
  const raw = process.env.OWUI_RETRY_MAX
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 3
}

export function getOwuiBreakerThreshold(): number {
  const raw = process.env.OWUI_BREAKER_THRESHOLD
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 5
}

export function getOwuiBreakerCooldownMs(): number {
  const raw = process.env.OWUI_BREAKER_COOLDOWN_MS
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 60000
}
