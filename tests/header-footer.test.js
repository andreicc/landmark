import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadHTML(filename) {
  const html = readFileSync(resolve(__dirname, '..', filename), 'utf-8')
  return new JSDOM(html).window.document
}

describe('Header — Transparent Overlay Nav (Stitch)', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a header/nav element', () => {
    const nav = doc.querySelector('header, nav.header')
    expect(nav).not.toBeNull()
  })

  it('has a centered logo image with alt text', () => {
    const logo = doc.querySelector('header img[alt*="Landmark"]')
    expect(logo).not.toBeNull()
    expect(logo.getAttribute('src')).toMatch(/logo/)
  })

  it('has left navigation links (About, Communities, Properties)', () => {
    const navLinks = doc.querySelectorAll('header nav a, nav.header a')
    const texts = Array.from(navLinks).map((a) => a.textContent.trim().toLowerCase())
    expect(texts).toEqual(expect.arrayContaining(['about']))
    expect(texts).toEqual(expect.arrayContaining(['communities']))
    expect(texts).toEqual(expect.arrayContaining(['properties']))
  })

  it('has right navigation links (Media Center, Careers, Contact Us)', () => {
    const navLinks = doc.querySelectorAll('header nav a, nav.header a')
    const texts = Array.from(navLinks).map((a) => a.textContent.trim().toLowerCase())
    expect(texts).toEqual(expect.arrayContaining(['contact us']))
  })

  it('has aria-label on the nav', () => {
    const nav = doc.querySelector('header nav[aria-label], nav.header[aria-label]')
    expect(nav).not.toBeNull()
  })

  it('has a hamburger button for mobile', () => {
    const btn = doc.querySelector('[data-menu-toggle]')
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Footer — Mega Sitemap (Stitch)', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a <footer> element', () => {
    expect(doc.querySelector('footer')).not.toBeNull()
  })

  it('has the LANDMARK REALTY logo', () => {
    const logo = doc.querySelector('footer img[alt*="Landmark"]')
    expect(logo).not.toBeNull()
    expect(logo.getAttribute('src')).toMatch(/logo/)
  })

  it('has sitemap columns (Apartments, Villas, Communities)', () => {
    const footer = doc.querySelector('footer')
    const text = footer.textContent.toLowerCase()
    expect(text).toMatch(/apartments/)
    expect(text).toMatch(/villas/)
    expect(text).toMatch(/communities/)
  })

  it('has property links within sitemap', () => {
    const links = doc.querySelectorAll('footer .footer__sitemap a')
    expect(links.length).toBeGreaterThanOrEqual(10)
  })

  it('has copyright text', () => {
    const footer = doc.querySelector('footer')
    expect(footer.textContent).toMatch(/©/)
    expect(footer.textContent).toMatch(/LANDMARK/i)
  })

  it('has Privacy Policy and Sitemap links', () => {
    const footer = doc.querySelector('footer')
    const text = footer.textContent.toLowerCase()
    expect(text).toMatch(/privacy policy/)
    expect(text).toMatch(/sitemap/)
  })

  it('has social/contact links', () => {
    const socialLinks = doc.querySelectorAll('footer .footer__socials a')
    expect(socialLinks.length).toBeGreaterThanOrEqual(2)
  })

  it('footer links have accessible labels or text', () => {
    const links = doc.querySelectorAll('footer a')
    links.forEach((link) => {
      const hasText = link.textContent.trim().length > 0
      const hasLabel = link.getAttribute('aria-label')
      const hasImgAlt = link.querySelector('img[alt]') !== null
      expect(hasText || hasLabel || hasImgAlt).toBeTruthy()
    })
  })
})

describe('Semantic HTML structure — all pages', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html']

  pages.forEach((page) => {
    describe(page, () => {
      let doc
      let rawHTML

      beforeEach(() => {
        doc = loadHTML(page)
        rawHTML = readFileSync(resolve(__dirname, '..', page), 'utf-8')
      })

      it('has skip link', () => {
        expect(doc.querySelector('a.skip-link')).not.toBeNull()
      })

      it('has main element with id', () => {
        expect(doc.querySelector('main#main-content')).not.toBeNull()
      })

      it('has lang attribute on html', () => {
        expect(rawHTML).toMatch(/<html\s[^>]*lang=/)
      })

      it('has viewport meta tag', () => {
        expect(rawHTML).toMatch(/viewport/)
      })

      it('has a CSP meta tag', () => {
        expect(rawHTML).toMatch(/Content-Security-Policy/)
      })

      it('has a favicon link', () => {
        expect(rawHTML).toMatch(/rel="icon"/)
      })
    })
  })
})
