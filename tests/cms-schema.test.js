import { describe, it, expect } from 'vitest'
import { validatePost, validateAuthor, validateCategory } from '../scripts/posts-schema.mjs'
import fixtures from '../data/media-fixtures.json' assert { type: 'json' }

describe('Post schema — contract for /media build-time fetch', () => {
  it('accepts a fully-formed published post', () => {
    const post = fixtures.posts.find((p) => p.status === 'published')
    expect(post).toBeDefined()
    const result = validatePost(post)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects a post missing required title.en', () => {
    const result = validatePost({
      id: 'x',
      slug: 'no-title',
      title: { en: '', ro: 'Ceva' },
      excerpt: { en: 'short', ro: 'scurt' },
      heroImage: { url: '/img.jpg', alt: { en: 'a', ro: 'a' } },
      body: { en: 'x', ro: 'x' },
      category: { slug: 'press', name: { en: 'Press', ro: 'Presă' } },
      author: { name: 'A', slug: 'a' },
      publishedAt: '2026-04-22T00:00:00Z',
      status: 'published',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('title.en'))).toBe(true)
  })

  it('rejects a post with an invalid status enum', () => {
    const post = fixtures.posts[0]
    const bad = { ...post, status: 'archived' }
    const result = validatePost(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('status'))).toBe(true)
  })

  it('rejects a post with non-ISO publishedAt', () => {
    const post = fixtures.posts[0]
    const bad = { ...post, publishedAt: 'last tuesday' }
    const result = validatePost(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('publishedAt'))).toBe(true)
  })

  it('rejects a post when excerpt.en exceeds 280 chars', () => {
    const post = fixtures.posts[0]
    const bad = { ...post, excerpt: { ...post.excerpt, en: 'x'.repeat(281) } }
    const result = validatePost(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('excerpt.en'))).toBe(true)
  })

  it('every fixture post passes validation', () => {
    fixtures.posts.forEach((post, i) => {
      const result = validatePost(post)
      expect(result.valid, `post ${i} (${post.slug}) errors: ${result.errors.join(', ')}`).toBe(true)
    })
  })

  it('every fixture author passes validation', () => {
    fixtures.authors.forEach((author, i) => {
      const result = validateAuthor(author)
      expect(result.valid, `author ${i} errors: ${result.errors.join(', ')}`).toBe(true)
    })
  })

  it('every fixture category passes validation', () => {
    fixtures.categories.forEach((cat, i) => {
      const result = validateCategory(cat)
      expect(result.valid, `category ${i} errors: ${result.errors.join(', ')}`).toBe(true)
    })
  })

  it('fixtures.posts contains at least 6 published posts (matches /media MVP)', () => {
    const published = fixtures.posts.filter((p) => p.status === 'published')
    expect(published.length).toBeGreaterThanOrEqual(6)
  })

  it('fixtures.categories has the expected three: press, journal, market', () => {
    const slugs = fixtures.categories.map((c) => c.slug).sort()
    expect(slugs).toEqual(['journal', 'market', 'press'])
  })
})
