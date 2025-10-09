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

export type CertificateStorageStrategy =
  | { type: 'filesystem'; directory: string }
  | { type: 'azure'; connectionString: string; container: string }

export function getCertificateStorageStrategy(): CertificateStorageStrategy | null {
  const mode = (process.env.CERT_STORAGE_MODE || '').toLowerCase()
  if (mode === 'azure') {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || ''
    const container = process.env.CERT_STORAGE_CONTAINER || 'certificates'
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is required when CERT_STORAGE_MODE=azure')
    }
    return { type: 'azure', connectionString, container }
  }
  const directory = process.env.CERT_STORAGE_DIR
  if (directory) {
    return { type: 'filesystem', directory }
  }
  return null
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
