import { describe, it, expect } from 'vitest'
import { renderHomeJournalCard, renderHomeJournalSection } from '../scripts/build-media.mjs'

const samplePost = (overrides = {}) => ({
  slug: 'topping-out-floor-24',
  tag: 'milestone',
  publishedAt: '2026-04-22T06:18:00Z',
  title: { en: 'Topping-out. Floor 24.', ro: 'Topping-out. Etajul 24.' },
  excerpt: { en: 'EN excerpt copy.', ro: 'RO excerpt copy.' },
  status: 'published',
  ...overrides,
})

describe('renderHomeJournalCard', () => {
  it('renders an EN card with /media/<slug> href', () => {
    const html = renderHomeJournalCard({ post: samplePost(), locale: 'en' })
    expect(html).toContain('href="/media/topping-out-floor-24"')
    expect(html).toContain('Topping-out. Floor 24.')
    expect(html).toContain('EN excerpt copy.')
    expect(html).toContain('Milestone')
    expect(html).toContain('Apr · 2026')
  })

  it('renders an RO card with /ro/media/<slug> href + Romanian tag label', () => {
    const html = renderHomeJournalCard({ post: samplePost(), locale: 'ro' })
    expect(html).toContain('href="/ro/media/topping-out-floor-24"')
    expect(html).toContain('Topping-out. Etajul 24.')
    expect(html).toContain('Reper')
  })

  it('escapes HTML in title and excerpt', () => {
    const post = samplePost({
      title: { en: 'A <script>alert(1)</script>', ro: '' },
      excerpt: { en: 'Has & ampersand', ro: '' },
    })
    const html = renderHomeJournalCard({ post, locale: 'en' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Has &amp; ampersand')
  })

  it('falls back to craft gradient for unknown tag', () => {
    const html = renderHomeJournalCard({ post: samplePost({ tag: 'wat' }), locale: 'en' })
    expect(html).toContain('#c9b58a')
  })
})

describe('renderHomeJournalSection', () => {
  const posts = [
    samplePost({ slug: 'older', publishedAt: '2026-01-10T00:00:00Z' }),
    samplePost({ slug: 'newest', publishedAt: '2026-04-22T00:00:00Z' }),
    samplePost({ slug: 'mid', publishedAt: '2026-03-01T00:00:00Z' }),
    samplePost({ slug: 'oldest', publishedAt: '2025-11-01T00:00:00Z' }),
    samplePost({ slug: 'second-newest', publishedAt: '2026-04-10T00:00:00Z' }),
  ]

  it('returns top 3 posts sorted by publishedAt desc', () => {
    const html = renderHomeJournalSection({ posts, locale: 'en' })
    const newestIdx = html.indexOf('href="/media/newest"')
    const secondIdx = html.indexOf('href="/media/second-newest"')
    const midIdx = html.indexOf('href="/media/mid"')
    const olderIdx = html.indexOf('href="/media/older"')
    const oldestIdx = html.indexOf('href="/media/oldest"')

    expect(newestIdx).toBeGreaterThanOrEqual(0)
    expect(secondIdx).toBeGreaterThan(newestIdx)
    expect(midIdx).toBeGreaterThan(secondIdx)
    expect(olderIdx).toBe(-1)
    expect(oldestIdx).toBe(-1)
  })

  it('skips posts without RO title when locale is ro', () => {
    const enOnly = [
      samplePost({ slug: 'en-only', title: { en: 'EN only', ro: '' }, publishedAt: '2026-04-22T00:00:00Z' }),
      samplePost({ slug: 'with-ro', publishedAt: '2026-03-01T00:00:00Z' }),
    ]
    const html = renderHomeJournalSection({ posts: enOnly, locale: 'ro' })
    expect(html).not.toContain('en-only')
    expect(html).toContain('with-ro')
  })

  it('returns empty string when no posts', () => {
    expect(renderHomeJournalSection({ posts: [], locale: 'en' })).toBe('')
  })
})
