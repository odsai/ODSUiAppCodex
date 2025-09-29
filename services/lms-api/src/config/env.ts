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

