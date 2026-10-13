// Best-effort per-caller throttle.
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

// Full sweep: drop expired stamps, then shed the least-recently-active keys if
// the map is still oversized. An unbounded Map in a warm instance is a slow
// leak, but sweeping on every call would make a flood O(n²) — so this runs
// only when the map has actually outgrown its cap.
function evict(now) {
  for (const [key, stamps] of hits) {
    const live = stamps.filter((t) => now - t < WINDOW_MS)
    if (live.length === 0) hits.delete(key)
    else hits.set(key, live)
  }
  if (hits.size > MAX_TRACKED_IPS) {
    const excess = hits.size - MAX_TRACKED_IPS
    for (const key of Array.from(hits.keys()).slice(0, excess)) hits.delete(key)
  }
}

export function takeToken(key, now = Date.now()) {
  // Prune only the key being touched, so the common path stays O(1).
  const previous = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS)

  if (previous.length >= MAX_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - previous[0])
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  // Re-insert rather than overwrite: Map.set on an existing key keeps its
  // original position, so without the delete, iteration order would be
  // first-seen and eviction would shed live keys instead of stale ones.
  hits.delete(key)
  hits.set(key, [...previous, now])

  if (hits.size > MAX_TRACKED_IPS) evict(now)
  return { allowed: true, retryAfterSeconds: 0 }
}

// Test seam only — production never needs to forget a window early.
export function resetRateLimit() {
  hits.clear()
}

export { WINDOW_MS, MAX_PER_WINDOW, MAX_TRACKED_IPS }
