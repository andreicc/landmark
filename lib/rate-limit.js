// Best-effort per-IP throttle.
//
// Serverless instances are ephemeral and horizontally scaled, so this counter
// is per-instance: a determined flood spread across cold starts slips through.
// It is here to blunt the common case — one script hammering one endpoint —
// and nothing more. The honeypot in lead-validate.js is the real filter. A
// durable limit would need Vercel KV or Upstash, which this project does not
// provision for a contact form.

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const MAX_TRACKED_IPS = 5000

const hits = new Map()

// Drop expired entries, and if the map is still oversized drop the oldest —
// an unbounded Map in a warm instance is a slow memory leak.
function evict(now) {
  for (const [ip, stamps] of hits) {
    const live = stamps.filter((t) => now - t < WINDOW_MS)
    if (live.length === 0) hits.delete(ip)
    else hits.set(ip, live)
  }
  if (hits.size > MAX_TRACKED_IPS) {
    const excess = hits.size - MAX_TRACKED_IPS
    for (const ip of Array.from(hits.keys()).slice(0, excess)) hits.delete(ip)
  }
}

export function takeToken(ip, now = Date.now()) {
  evict(now)
  const previous = hits.get(ip) || []
  if (previous.length >= MAX_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - previous[0])
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }
  // Re-insert rather than overwrite, so Map iteration order is least-recently
  // active first and eviction sheds the stalest keys instead of live ones.
  hits.delete(ip)
  hits.set(ip, [...previous, now])
  return { allowed: true, retryAfterSeconds: 0 }
}

// Test seam only — production never needs to forget a window early.
export function resetRateLimit() {
  hits.clear()
}

export { WINDOW_MS, MAX_PER_WINDOW }
