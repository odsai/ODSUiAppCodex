type Counters = {
  tutor_success_total: number
  tutor_failure_total: number
}

const counters: Counters = {
  tutor_success_total: 0,
  tutor_failure_total: 0,
}

const latencies: number[] = []
const LAT_MAX = 200

export function recordTutorSuccess(latencyMs?: number) {
  counters.tutor_success_total += 1
  if (typeof latencyMs === 'number') {
    latencies.push(latencyMs)
    if (latencies.length > LAT_MAX) latencies.shift()
  }
}

export function recordTutorFailure() {
  counters.tutor_failure_total += 1
}

export function metricsSnapshot() {
  const sorted = [...latencies].sort((a, b) => a - b)
  const p = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0)
  return {
    ...counters,
    tutor_latency_p95_ms: p(0.95),
    tutor_latency_p99_ms: p(0.99),
    samples: sorted.length,
  }
}

