import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const PAGES = [
  { label: 'EN media', file: 'media.html', lang: 'en' },
  { label: 'RO media', file: 'ro/media.html', lang: 'ro' },
]

const read = (p) => readFileSync(resolve(root, p), 'utf-8')
const load = (p) => new JSDOM(read(p)).window.document

// The journal shipped with twelve invented entries — a build log for floors
// that do not exist, a Dezeen feature with made-up reach figures and a
// Wallpaper* profile crediting a named journalist. All of it is gone; the
// section now says so plainly until there is real material.
describe('Media — coming-soon state', () => {
  PAGES.forEach(({ label, file, lang }) => {
    describe(label, () => {
      let doc

      beforeEach(() => {
        doc = load(file)
      })

      it('exists with one h1 and a skip-link target', () => {
        expect(existsSync(resolve(root, file))).toBe(true)
        expect(doc.querySelectorAll('h1')).toHaveLength(1)
        expect(doc.querySelector('main#main-content')).not.toBeNull()
      })

      it('is in the right language', () => {
        expect(doc.documentElement.getAttribute('lang')).toBe(lang)
      })

      it('says the journal is still to come', () => {
        const text = doc.body.textContent.replace(/\s+/g, ' ')
        const expected = lang === 'ro' ? /în cur[âa]nd/i : /coming soon/i
        expect(text).toMatch(expected)
      })

      it('offers a way onward rather than a dead end', () => {
        const hrefs = Array.from(doc.querySelectorAll('main a')).map((a) => a.getAttribute('href'))
        const prefix = lang === 'ro' ? '/ro' : ''
        expect(hrefs).toEqual(expect.arrayContaining([`${prefix}/projects`, `${prefix}/contact`]))
      })

      it('carries no post entries at all', () => {
        expect(doc.querySelectorAll('[data-post]')).toHaveLength(0)
      })

      it('carries no tag filters, sort controls or newsletter form', () => {
        // Each of these drove the feed; leaving the markup would leave the
        // page wired to elements its script no longer touches.
        ;['[data-filter]', '#postCount', '#latestBtn', '#oldestBtn', '#subForm'].forEach((sel) => {
          expect(doc.querySelector(sel), `${sel} should be gone`).toBeNull()
        })
      })
    })
  })
})

describe('Media — no fabricated press', () => {
  const ALL = [...PAGES.map((p) => p.file), 'index.html', 'ro/index.html', 'projects.html', 'ro/projects.html']

  it.each(ALL)('%s claims no coverage from a real publication', (file) => {
    const raw = read(file)
    ;[/Dezeen/i, /Wallpaper\*/i, /Igloo/i, /ArchDaily/i].forEach((outlet) => {
      expect(raw, `${file} still cites ${outlet}`).not.toMatch(outlet)
    })
  })

  it('ships no generated article pages', () => {
    ;['media', 'ro/media'].forEach((dir) => {
      const path = resolve(root, dir)
      const files = existsSync(path) ? readdirSync(path).filter((f) => f.endsWith('.html')) : []
      expect(files, `${dir} still has generated articles`).toEqual([])
    })
  })

  it('leaves the CMS injection point intact for when real posts arrive', () => {
    // The coming-soon panel is a sibling of the grid, not a replacement for
    // it, so restoring the journal is a delete rather than a rebuild.
    ;['index.html', 'ro/index.html'].forEach((file) => {
      expect(read(file)).toContain('<!-- LATEST_JOURNAL -->')
    })
  })
})
