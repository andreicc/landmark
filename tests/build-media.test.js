import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildMedia, normalizePayloadPost, renderMediaIndex } from '../scripts/build-media.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

let workDir

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'media-build-'))
  mkdirSync(join(workDir, 'data'), { recursive: true })
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

function payloadResponse({ locale = 'en', docs = [] } = {}) {
  return {
    docs,
    totalDocs: docs.length,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 100,
  }
}

function rawPost({ id = 1, slug = 'sample', titleEn = 'Sample post', titleRo = 'Articol model' } = {}) {
  return {
    id,
    slug,
    title: titleEn,
    excerpt: 'A short summary of the post that fits within 280 chars.',
    heroImage: {
      id: 99,
      url: '/api/media/file/hero.jpg',
      alt: 'A hero image',
    },
    body: { root: { children: [{ type: 'paragraph', children: [{ text: 'Body text' }] }] } },
    category: { id: 1, slug: 'journal', name: 'Journal' },
    author: { id: 1, slug: 'site-team', name: 'Site Team' },
    publishedAt: '2026-04-22T06:00:00Z',
    _status: 'published',
    tag: 'milestone',
  }
}

describe('build-media — normalizePayloadPost', () => {
  it('merges EN and RO Payload responses into our schema shape', () => {
    const en = rawPost({ slug: 'a', titleEn: 'A' })
    const ro = { ...rawPost({ slug: 'a', titleEn: 'A' }), title: 'Articol A' }
    const merged = normalizePayloadPost(en, ro)
    expect(merged.title.en).toBe('A')
    expect(merged.title.ro).toBe('Articol A')
    expect(merged.slug).toBe('a')
  })

  it('omits ro field when RO post is null', () => {
    const merged = normalizePayloadPost(rawPost(), null)
    expect(merged.title.en).toBe('Sample post')
    expect(merged.title.ro).toBeUndefined()
  })
})

describe('build-media — pipeline', () => {
  it('writes media/<slug>.html for each published EN post', async () => {
    const fetcher = async (locale) => payloadResponse({ docs: [rawPost({ slug: 'first-post' })] })
    await buildMedia({ fetcher, outDir: workDir })
    expect(existsSync(join(workDir, 'media', 'first-post.html'))).toBe(true)
  })

  it('writes ro/media/<slug>.html when RO translation exists', async () => {
    const fetcher = async (locale) =>
      payloadResponse({ docs: [{ ...rawPost({ slug: 'a' }), title: locale === 'ro' ? 'Articol A' : 'A' }] })
    await buildMedia({ fetcher, outDir: workDir })
    expect(existsSync(join(workDir, 'ro', 'media', 'a.html'))).toBe(true)
  })

  it('emits a manifest with all generated slug paths', async () => {
    const fetcher = async () => payloadResponse({ docs: [rawPost({ slug: 'm1' }), rawPost({ id: 2, slug: 'm2' })] })
    await buildMedia({ fetcher, outDir: workDir })
    const manifest = JSON.parse(readFileSync(join(workDir, 'data', 'media-manifest.json'), 'utf-8'))
    expect(manifest.slugs.sort()).toEqual(['m1', 'm2'])
  })

  it('falls back to fixtures when fetch fails', async () => {
    const fetcher = async () => {
      throw new Error('CMS unreachable')
    }
    await buildMedia({ fetcher, outDir: workDir, fixturesPath: resolve(repoRoot, 'data/media-fixtures.json') })
    const manifest = JSON.parse(readFileSync(join(workDir, 'data', 'media-manifest.json'), 'utf-8'))
    expect(manifest.fallback).toBe(true)
    expect(manifest.slugs.length).toBeGreaterThan(0)
  })

  it('throws when no fetcher result and no fixtures available', async () => {
    const fetcher = async () => {
      throw new Error('CMS unreachable')
    }
    await expect(
      buildMedia({ fetcher, outDir: workDir, fixturesPath: '/nonexistent.json' }),
    ).rejects.toThrow()
  })

  it('written article HTML contains the post title', async () => {
    const fetcher = async () => payloadResponse({ docs: [rawPost({ slug: 't', titleEn: 'Concrete pour day' })] })
    await buildMedia({ fetcher, outDir: workDir })
    const html = readFileSync(join(workDir, 'media', 't.html'), 'utf-8')
    expect(html).toContain('Concrete pour day')
    expect(html).toContain('<html')
    expect(html).toContain('lang="en"')
  })

  it('article HTML has hreflang to RO when RO version exists', async () => {
    const fetcher = async (locale) =>
      payloadResponse({ docs: [{ ...rawPost({ slug: 'a' }), title: locale === 'ro' ? 'AR' : 'A' }] })
    await buildMedia({ fetcher, outDir: workDir })
    const html = readFileSync(join(workDir, 'media', 'a.html'), 'utf-8')
    expect(html).toContain('hreflang="ro"')
    expect(html).toContain('/ro/media/a')
  })

  it('does not overwrite the static media.html index (design preserved)', async () => {
    const fetcher = async () => payloadResponse({ docs: [rawPost()] })
    await buildMedia({ fetcher, outDir: workDir })
    // The build pipeline must not produce a media.html — that file stays
    // as the curated Stitch design.
    expect(existsSync(join(workDir, 'media.html'))).toBe(false)
    expect(existsSync(join(workDir, 'ro', 'media.html'))).toBe(false)
  })
})

describe('renderMediaIndex', () => {
  function fakePost(over = {}) {
    return {
      slug: 'a',
      title: { en: 'Title EN', ro: 'Title RO' },
      excerpt: { en: 'EN excerpt', ro: 'RO excerpt' },
      heroImage: { url: '/img.jpg', alt: { en: 'alt EN' } },
      body: { en: '<p>x</p>' },
      category: { slug: 'journal', name: { en: 'Journal', ro: 'Jurnal' } },
      author: { slug: 'site-team', name: 'Site Team' },
      publishedAt: '2026-04-22T00:00:00Z',
      status: 'published',
      tag: 'milestone',
      ...over,
    }
  }

  it('renders EN index with one card per post', () => {
    const html = renderMediaIndex({ posts: [fakePost(), fakePost({ slug: 'b' })], locale: 'en' })
    expect(html).toContain('lang="en"')
    expect(html).toContain('href="/media/a"')
    expect(html).toContain('href="/media/b"')
  })

  it('renders RO index linking to /ro/media/<slug>', () => {
    const html = renderMediaIndex({ posts: [fakePost()], locale: 'ro' })
    expect(html).toContain('lang="ro"')
    expect(html).toContain('href="/ro/media/a"')
  })

  it('shows the EN title in EN index, RO title in RO index', () => {
    const en = renderMediaIndex({ posts: [fakePost()], locale: 'en' })
    const ro = renderMediaIndex({ posts: [fakePost()], locale: 'ro' })
    expect(en).toContain('Title EN')
    expect(ro).toContain('Title RO')
  })

  it('includes filter pills', () => {
    const html = renderMediaIndex({ posts: [fakePost()], locale: 'en' })
    expect(html).toMatch(/data-filter="all"/)
  })

  it('renders an empty state when no posts', () => {
    const html = renderMediaIndex({ posts: [], locale: 'en' })
    expect(html).toContain('lang="en"')
    expect(html).toMatch(/no posts|empty|nothing yet/i)
  })
})
