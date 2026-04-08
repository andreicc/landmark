import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadHTML(filename) {
  const html = readFileSync(resolve(__dirname, '..', filename), 'utf-8')
  const dom = new JSDOM(html)
  return dom.window.document
}

describe('Header component', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a <header> element', () => {
    expect(doc.querySelector('header')).not.toBeNull()
  })

  it('has a logo link pointing to homepage', () => {
    const logoLink = doc.querySelector('header a[href="/"], header a[href="index.html"]')
    expect(logoLink).not.toBeNull()
  })

  it('has a <nav> with aria-label and navigation links', () => {
    const nav = doc.querySelector('header nav')
    expect(nav).not.toBeNull()
    expect(nav.getAttribute('aria-label')).toBeTruthy()
    const links = nav.querySelectorAll('a')
    expect(links.length).toBeGreaterThanOrEqual(3)
  })

  it('has links to About, Projects, and Contact pages', () => {
    const nav = doc.querySelector('header nav')
    expect(nav).not.toBeNull()
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('about'),
        expect.stringContaining('projects'),
        expect.stringContaining('contact'),
      ])
    )
  })

  it('marks the active page with aria-current="page"', () => {
    const active = doc.querySelector('header nav a[aria-current="page"]')
    expect(active).not.toBeNull()
  })

  it('has a hamburger button with data-menu-toggle', () => {
    const btn = doc.querySelector('header [data-menu-toggle]')
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-label')).toBeTruthy()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Footer component', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a <footer> element', () => {
    expect(doc.querySelector('footer')).not.toBeNull()
  })

  it('contains copyright symbol and year', () => {
    const footer = doc.querySelector('footer')
    expect(footer.textContent).toMatch(/landmark/i)
    expect(footer.textContent).toMatch(/©\s*\d{4}/)
  })

  it('has social media links with rel="noopener noreferrer"', () => {
    const socialLinks = doc.querySelectorAll('footer .footer__socials a')
    expect(socialLinks.length).toBeGreaterThanOrEqual(2)
    socialLinks.forEach((link) => {
      expect(link.getAttribute('rel')).toContain('noopener')
      expect(link.getAttribute('rel')).toContain('noreferrer')
    })
  })

  it('has interactive phone and email links', () => {
    const phoneLink = doc.querySelector('footer a[href^="tel:"]')
    const emailLink = doc.querySelector('footer a[href^="mailto:"]')
    expect(phoneLink).not.toBeNull()
    expect(emailLink).not.toBeNull()
  })

  it('has a footer navigation wrapped in <nav>', () => {
    const footerNav = doc.querySelector('footer nav')
    expect(footerNav).not.toBeNull()
    expect(footerNav.getAttribute('aria-label')).toBeTruthy()
  })

  it('uses semantic headings in footer columns', () => {
    const headings = doc.querySelectorAll('footer h3')
    expect(headings.length).toBeGreaterThanOrEqual(2)
  })

  it('has footer brand as a link to homepage', () => {
    const brandLink = doc.querySelector('footer a.footer__brand')
    expect(brandLink).not.toBeNull()
  })
})

describe('Semantic HTML structure', () => {
  let doc
  let rawHTML

  beforeEach(() => {
    doc = loadHTML('index.html')
    rawHTML = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf-8')
  })

  it('has a <main> element with id for skip link', () => {
    const main = doc.querySelector('main')
    expect(main).not.toBeNull()
    expect(main.getAttribute('id')).toBe('main-content')
  })

  it('uses semantic sections inside main', () => {
    const sections = doc.querySelectorAll('main section')
    expect(sections.length).toBeGreaterThanOrEqual(1)
  })

  it('has a skip navigation link', () => {
    const skipLink = doc.querySelector('a.skip-link[href="#main-content"]')
    expect(skipLink).not.toBeNull()
  })

  it('has a lang attribute on html', () => {
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

describe('Accessibility on all pages', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html']

  pages.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('has header with aria-labeled nav', () => {
        const nav = doc.querySelector('header nav[aria-label]')
        expect(nav).not.toBeNull()
      })

      it('has skip link', () => {
        const skip = doc.querySelector('a.skip-link')
        expect(skip).not.toBeNull()
      })

      it('has main element with id', () => {
        const main = doc.querySelector('main#main-content')
        expect(main).not.toBeNull()
      })

      it('has footer nav with aria-label', () => {
        const footerNav = doc.querySelector('footer nav[aria-label]')
        expect(footerNav).not.toBeNull()
      })

      it('external links have rel="noopener noreferrer"', () => {
        const externalLinks = doc.querySelectorAll('a[target="_blank"]')
        externalLinks.forEach((link) => {
          expect(link.getAttribute('rel')).toContain('noopener')
        })
      })
    })
  })
})
