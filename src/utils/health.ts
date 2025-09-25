export async function ping(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    if (!url) return false
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    // Use no-cors to avoid CORS failures blocking basic reachability check
    const res = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal as any })
    clearTimeout(t)
    // If fetch resolved (even opaque), assume reachable
    return !!res
  } catch {
    return false
  }
}

