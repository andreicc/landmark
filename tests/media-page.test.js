import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadDoc(filepath) {
  const html = readFileSync(resolve(root, filepath), 'utf-8')
  return new JSDOM(html).window.document
}

const pages = [
  { path: 'media.html', label: 'EN media' },
  { path: 'ro/media.html', label: 'RO media' },
]

describe('Media — index page structure', () => {
  pages.forEach(({ path, label }) => {
    describe(label, () => {
      it('file exists', () => {
        expect(existsSync(resolve(root, path))).toBe(true)
      })

      it('has a single h1', () => {
        const doc = loadDoc(path)
        expect(doc.querySelectorAll('h1').length).toBe(1)
      })

      it('has main#main-content for skip link target', () => {
        const doc = loadDoc(path)
        expect(doc.querySelector('main#main-content')).not.toBeNull()
      })

      it('has a skip link', () => {
        const doc = loadDoc(path)
        expect(doc.querySelector('a.skip-link')).not.toBeNull()
      })

      it('has a language switcher', () => {
        const doc = loadDoc(path)
        expect(doc.querySelector('[data-lang-switcher]')).not.toBeNull()
      })

      it('has at least 6 post entries', () => {
        const doc = loadDoc(path)
        const posts = doc.querySelectorAll('[data-post], article.post, article.journal-card')
        expect(posts.length).toBeGreaterThanOrEqual(6)
      })

      it('has at least one featured/pinned post', () => {
        const doc = loadDoc(path)
        const featured = doc.querySelector('[data-post].is-pin, [data-featured], article.featured')
        expect(featured).not.toBeNull()
      })

      it('has filter pills or category tags', () => {
        const doc = loadDoc(path)
        const filters = doc.querySelectorAll('[data-filter], .chip, .filter-pill')
        expect(filters.length).toBeGreaterThanOrEqual(3)
      })

      it('has hreflang alternates', () => {
        const doc = loadDoc(path)
        expect(doc.querySelector('link[rel="alternate"][hreflang="en"]')).not.toBeNull()
        expect(doc.querySelector('link[rel="alternate"][hreflang="ro"]')).not.toBeNull()
      })
    })
  })
})
