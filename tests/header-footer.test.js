import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const EN_PAGES = ['index.html', 'about.html', 'contact.html', 'projects.html', 'media.html']
const ALL_PAGES = EN_PAGES.flatMap((p) => [p, `ro/${p}`])

function loadHTML(filepath) {
  return new JSDOM(readFileSync(resolve(root, filepath), 'utf-8')).window.document
}

function readRaw(filepath) {
  return readFileSync(resolve(root, filepath), 'utf-8')
}

// Nav labels per locale. The nav was reduced to four destinations in b0b6ff1
// (Communities + Careers dropped, Properties renamed to the project name).
const NAV_LABELS = {
  en: ['About', 'Landmark 4 Project', 'Media', 'Contact'],
  ro: ['Despre noi', 'Proiectul Landmark 4', 'Media', 'Contact'],
}

describe('Header — overlay nav', () => {
  ALL_PAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('wraps the main nav in a <header> landmark', () => {
        const header = doc.querySelector('header')
        expect(header).not.toBeNull()
        const nav = doc.querySelector('nav[aria-label="Main"]')
        expect(nav).not.toBeNull()
        expect(header.contains(nav)).toBe(true)
      })

      it('has both logo variants, each with alt text', () => {
        const logos = doc.querySelectorAll('header img[alt*="Landmark"]')
        // Two variants: white over the hero, green once the nav goes solid.
        expect(logos.length).toBe(2)
        logos.forEach((logo) => {
          expect(logo.getAttribute('src')).toMatch(/logo/)
          expect(logo.getAttribute('alt')).toBeTruthy()
        })
      })

      it('links to the four nav destinations', () => {
        const locale = page.startsWith('ro/') ? 'ro' : 'en'
        const texts = Array.from(doc.querySelectorAll('header nav a')).map((a) =>
          a.textContent.trim(),
        )
        expect(texts).toEqual(expect.arrayContaining(NAV_LABELS[locale]))
      })

      it('does not resurrect the retired Communities / Careers links', () => {
        const texts = Array.from(doc.querySelectorAll('header nav a')).map((a) =>
          a.textContent.trim().toLowerCase(),
        )
        expect(texts).not.toContain('communities')
        expect(texts).not.toContain('careers')
      })

      it('has a language switcher offering EN and RO', () => {
        const switcher = doc.querySelector('[data-lang-switcher]')
        expect(switcher).not.toBeNull()
        expect(switcher.querySelector('a[hreflang="en"]')).not.toBeNull()
        expect(switcher.querySelector('a[hreflang="ro"]')).not.toBeNull()
      })

      it('gives every header control an accessible name', () => {
        const controls = doc.querySelectorAll('header button')
        expect(controls.length).toBeGreaterThan(0)
        controls.forEach((btn) => {
          const named = btn.getAttribute('aria-label') || btn.textContent.trim()
          expect(named).toBeTruthy()
        })
      })
    })
  })

  // The redesigned nav hides its links below the lg breakpoint (`hidden lg:flex`)
  // and ships no hamburger, so there is no way to navigate on a phone. Tracked
  // here rather than asserted, because the markup to test does not exist yet.
  it.todo('offers a mobile navigation affordance below the lg breakpoint')
})

describe('Footer — sitemap', () => {
  ALL_PAGES.forEach((page) => {
    describe(page, () => {
      let footer

      beforeEach(() => {
        footer = loadHTML(page).querySelector('footer')
      })

      it('exists and carries the wordmark', () => {
        expect(footer).not.toBeNull()
        const logo = footer.querySelector('img[alt*="Landmark"]')
        expect(logo).not.toBeNull()
        expect(logo.getAttribute('src')).toMatch(/logo/)
      })

      it('groups links under column headings', () => {
        // Each page ships its own contextual sitemap (the projects footer links
        // into the project's own sections), so only the shape is universal.
        const headings = Array.from(footer.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
          h.textContent.trim(),
        )
        expect(headings.length).toBeGreaterThanOrEqual(3)
        headings.forEach((h) => expect(h).toBeTruthy())
      })

      it('has at least 8 links', () => {
        expect(footer.querySelectorAll('a').length).toBeGreaterThanOrEqual(8)
      })

      it('has copyright text', () => {
        expect(footer.textContent).toMatch(/©/)
        expect(footer.textContent).toMatch(/LANDMARK/i)
      })

      it('opens with a contact call to action', () => {
        const locale = page.startsWith('ro/') ? 'ro' : 'en'
        const expected = locale === 'ro' ? /Contactează-ne/ : /Get in Touch/
        expect(footer.textContent).toMatch(expected)
      })

      it('has privacy and terms links', () => {
        const locale = page.startsWith('ro/') ? 'ro' : 'en'
        const texts = Array.from(footer.querySelectorAll('a')).map((a) => a.textContent.trim())
        const legal = locale === 'ro' ? ['Confidențialitate', 'Termeni'] : ['Privacy', 'Terms']
        expect(texts).toEqual(expect.arrayContaining(legal))
      })

      it('does not resurrect the retired Communities / Careers links', () => {
        // b50e412 removed these from all ten footers.
        const texts = Array.from(footer.querySelectorAll('a')).map((a) =>
          a.textContent.trim().toLowerCase(),
        )
        expect(texts).not.toContain('communities')
        expect(texts).not.toContain('careers')
      })

      it('gives every link an accessible name', () => {
        const links = footer.querySelectorAll('a')
        expect(links.length).toBeGreaterThan(0)
        links.forEach((link) => {
          const named =
            link.textContent.trim() ||
            link.getAttribute('aria-label') ||
            link.querySelector('img[alt]')?.getAttribute('alt')
          expect(named).toBeTruthy()
        })
      })
    })
  })
})

describe('Semantic HTML structure — all pages', () => {
  ALL_PAGES.forEach((page) => {
    describe(page, () => {
      let doc
      let rawHTML

      beforeEach(() => {
        doc = loadHTML(page)
        rawHTML = readRaw(page)
      })

      it('has skip link', () => {
        expect(doc.querySelector('a.skip-link')).not.toBeNull()
      })

      it('has main element with id', () => {
        expect(doc.querySelector('main#main-content')).not.toBeNull()
      })

      it('has lang attribute on html', () => {
        const expected = page.startsWith('ro/') ? 'ro' : 'en'
        expect(doc.documentElement.getAttribute('lang')).toBe(expected)
      })

      it('has viewport meta tag', () => {
        expect(rawHTML).toMatch(/name="viewport"/)
      })

      it('has a favicon link', () => {
        expect(rawHTML).toMatch(/rel="icon"/)
      })
    })
  })
})

describe('Content-Security-Policy', () => {
  // The CSP moved out of per-page <meta> tags and into response headers in
  // b2a950f, so it is configured once in vercel.json rather than ten times.
  const config = JSON.parse(readRaw('vercel.json'))

  it('is served as a response header for every route', () => {
    const rule = config.headers.find((h) => h.source === '/(.*)')
    expect(rule).toBeDefined()
    const csp = rule.headers.find((h) => h.key === 'Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(csp.value).toMatch(/default-src 'self'/)
    expect(csp.value).toMatch(/frame-ancestors 'none'/)
  })

  it('is not duplicated as a per-page meta tag', () => {
    ALL_PAGES.forEach((page) => {
      expect(readRaw(page)).not.toMatch(/http-equiv="Content-Security-Policy"/)
    })
  })

  it('ships the other baseline security headers', () => {
    const rule = config.headers.find((h) => h.source === '/(.*)')
    const keys = rule.headers.map((h) => h.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]),
    )
  })
})
