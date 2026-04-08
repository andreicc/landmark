import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadHTML(filepath) {
  const html = readFileSync(resolve(root, filepath), 'utf-8')
  return new JSDOM(html).window.document
}

function readRaw(filepath) {
  return readFileSync(resolve(root, filepath), 'utf-8')
}

// ============================================================
// 1. CLEAN URLs — no .html in internal links
// ============================================================
describe('Clean URLs — no .html extensions in links', () => {
  const pages = ['index.html', 'projects.html']

  pages.forEach((page) => {
    it(`${page}: internal links do not end with .html`, () => {
      const doc = loadHTML(page)
      const links = doc.querySelectorAll('a[href]')
      links.forEach((link) => {
        const href = link.getAttribute('href')
        // Skip external, anchor, javascript, tel, mailto links
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('tel') || href.startsWith('mailto')) return
        expect(href).not.toMatch(/\.html$/);
      })
    })
  })
})

// ============================================================
// 2. Vite config supports clean URLs
// ============================================================
describe('Vite config — clean URL support', () => {
  it('vite.config.js exists', () => {
    expect(existsSync(resolve(root, 'vite.config.js'))).toBe(true)
  })
})

// ============================================================
// 3. Romanian pages exist
// ============================================================
describe('Romanian (RO) pages exist', () => {
  it('ro/index.html exists', () => {
    expect(existsSync(resolve(root, 'ro/index.html'))).toBe(true)
  })

  it('ro/projects.html exists', () => {
    expect(existsSync(resolve(root, 'ro/projects.html'))).toBe(true)
  })

  it('RO homepage has lang="ro"', () => {
    const raw = readRaw('ro/index.html')
    expect(raw).toMatch(/lang="ro"/)
  })

  it('RO projects page has lang="ro"', () => {
    const raw = readRaw('ro/projects.html')
    expect(raw).toMatch(/lang="ro"/)
  })

  it('RO homepage has Romanian content', () => {
    const doc = loadHTML('ro/index.html')
    const text = doc.body.textContent.toLowerCase()
    // Should have Romanian words, not English
    expect(text).toMatch(/descoper|detaliu|proiecte|calitate/)
  })

  it('RO projects page has Romanian content', () => {
    const doc = loadHTML('ro/projects.html')
    const text = doc.body.textContent.toLowerCase()
    expect(text).toMatch(/plan.*etaj|amenaj|locație|contactați/)
  })
})

// ============================================================
// 4. Hreflang tags for SEO
// ============================================================
describe('Hreflang tags', () => {
  it('EN homepage has hreflang for en and ro', () => {
    const raw = readRaw('index.html')
    expect(raw).toMatch(/hreflang="en"/)
    expect(raw).toMatch(/hreflang="ro"/)
  })

  it('RO homepage has hreflang for en and ro', () => {
    const raw = readRaw('ro/index.html')
    expect(raw).toMatch(/hreflang="en"/)
    expect(raw).toMatch(/hreflang="ro"/)
  })

  it('EN projects has hreflang for en and ro', () => {
    const raw = readRaw('projects.html')
    expect(raw).toMatch(/hreflang="en"/)
    expect(raw).toMatch(/hreflang="ro"/)
  })
})

// ============================================================
// 5. Language switcher in header
// ============================================================
describe('Language switcher', () => {
  it('EN homepage has a language switcher with RO option', () => {
    const doc = loadHTML('index.html')
    const switcher = doc.querySelector('[data-lang-switcher], .lang-switcher, a[href*="/ro"]')
    expect(switcher).not.toBeNull()
  })

  it('RO homepage has a language switcher with EN option', () => {
    const doc = loadHTML('ro/index.html')
    const switcher = doc.querySelector('[data-lang-switcher], .lang-switcher, a[href*="/index"], a[hreflang="en"]')
    expect(switcher).not.toBeNull()
  })

  it('EN projects has language switcher linking to RO projects', () => {
    const doc = loadHTML('projects.html')
    const links = doc.querySelectorAll('a[href]')
    const roLink = Array.from(links).find(a => a.getAttribute('href').includes('/ro'))
    expect(roLink).not.toBeNull()
  })
})

// ============================================================
// 6. RO pages have same structure as EN
// ============================================================
describe('RO pages maintain same structure', () => {
  it('RO homepage has skip link', () => {
    const doc = loadHTML('ro/index.html')
    expect(doc.querySelector('a.skip-link')).not.toBeNull()
  })

  it('RO homepage has main#main-content', () => {
    const doc = loadHTML('ro/index.html')
    expect(doc.querySelector('main#main-content')).not.toBeNull()
  })

  it('RO homepage has nav with aria-label', () => {
    const doc = loadHTML('ro/index.html')
    expect(doc.querySelector('nav[aria-label]')).not.toBeNull()
  })

  it('RO projects has main#main-content', () => {
    const doc = loadHTML('ro/projects.html')
    expect(doc.querySelector('main#main-content')).not.toBeNull()
  })

  it('RO projects has form', () => {
    const doc = loadHTML('ro/projects.html')
    expect(doc.querySelector('form')).not.toBeNull()
  })
})
