import { describe, it, expect, beforeEach } from 'vitest'
import { takeToken, resetRateLimit, WINDOW_MS, MAX_PER_WINDOW, MAX_TRACKED_IPS } from '../lib/rate-limit.js'

describe('takeToken', () => {
  beforeEach(() => resetRateLimit())

  it('allows up to the cap, then refuses', () => {
    for (let i = 0; i < MAX_PER_WINDOW; i += 1) {
      expect(takeToken('1.1.1.1').allowed, `request ${i + 1}`).toBe(true)
    }
    expect(takeToken('1.1.1.1').allowed).toBe(false)
  })

  it('reports a positive Retry-After in seconds', () => {
    const now = 1_000_000
    for (let i = 0; i < MAX_PER_WINDOW; i += 1) takeToken('2.2.2.2', now)
    const { allowed, retryAfterSeconds } = takeToken('2.2.2.2', now)
    expect(allowed).toBe(false)
    expect(retryAfterSeconds).toBeGreaterThan(0)
    expect(retryAfterSeconds).toBeLessThanOrEqual(WINDOW_MS / 1000)
  })

  it('counts each address separately', () => {
    for (let i = 0; i < MAX_PER_WINDOW; i += 1) takeToken('3.3.3.3')
    expect(takeToken('3.3.3.3').allowed).toBe(false)
    expect(takeToken('4.4.4.4').allowed).toBe(true)
  })

  it('forgives an address once its window has passed', () => {
    const now = 5_000_000
    for (let i = 0; i < MAX_PER_WINDOW; i += 1) takeToken('5.5.5.5', now)
    expect(takeToken('5.5.5.5', now).allowed).toBe(false)
    expect(takeToken('5.5.5.5', now + WINDOW_MS + 1).allowed).toBe(true)
  })

  it('stays bounded, and stays fast, under more keys than it tracks', () => {
    // Two regressions guarded here. Pruning once deleted and reinserted while
    // iterating the Map, which re-queued each key for the same pass and never
    // terminated. Then sweeping every key on every call made a flood O(n²).
    const now = 9_000_000
    const started = Date.now()
    const keys = MAX_TRACKED_IPS + 1000
    for (let i = 0; i < keys; i += 1) takeToken(`10.0.${i >> 8}.${i & 255}`, now)
    expect(Date.now() - started).toBeLessThan(2000)
    expect(takeToken('10.9.9.9', now + WINDOW_MS / 2).allowed).toBe(true)
    expect(takeToken('10.9.9.9', now + WINDOW_MS + 1).allowed).toBe(true)
  })

  it('lets a slow trickle through indefinitely', () => {
    const spacing = WINDOW_MS / 2
    for (let i = 0; i < 20; i += 1) {
      expect(takeToken('6.6.6.6', i * spacing).allowed, `visit ${i}`).toBe(true)
    }
  })
})
