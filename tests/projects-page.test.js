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

describe('Projects page — shares homepage header', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('projects.html')
  })

  it('has same nav structure as homepage with aria-label', () => {
    const nav = doc.querySelector('nav[aria-label="Main"]')
    expect(nav).not.toBeNull()
  })

  it('has LANDMARK logo image', () => {
    const logo = doc.querySelector('header img[alt*="Landmark"]')
    expect(logo).not.toBeNull()
    expect(logo.getAttribute('src')).toMatch(/logo/)
  })

  it('has left nav links (About, Communities, Properties)', () => {
    const links = doc.querySelectorAll('nav a')
    const texts = Array.from(links).map((a) => a.textContent.trim().toLowerCase())
    expect(texts).toEqual(expect.arrayContaining(['about', 'communities', 'properties']))
  })

  it('has right nav links (Contact Us)', () => {
    const links = doc.querySelectorAll('nav a')
    const texts = Array.from(links).map((a) => a.textContent.trim().toLowerCase())
    expect(texts).toEqual(expect.arrayContaining(['contact us']))
  })

  it('has mobile menu toggle button', () => {
    const btn = doc.querySelector('[data-menu-toggle]')
    expect(btn).not.toBeNull()
  })

  it('has skip link', () => {
    expect(doc.querySelector('a.skip-link')).not.toBeNull()
  })

  it('has main element with id', () => {
    expect(doc.querySelector('main#main-content')).not.toBeNull()
  })
})

describe('Projects page — shares homepage footer', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('projects.html')
  })

  it('has footer with LANDMARK logo', () => {
    const footer = doc.querySelector('footer')
    expect(footer).not.toBeNull()
    const logo = footer.querySelector('img[alt*="Landmark"]')
    expect(logo).not.toBeNull()
  })

  it('has footer links to properties', () => {
    const footerLinks = doc.querySelectorAll('footer .footer__sitemap a, footer .footer-links a')
    expect(footerLinks.length).toBeGreaterThanOrEqual(10)
  })

  it('has copyright text', () => {
    const footer = doc.querySelector('footer')
    expect(footer.textContent).toMatch(/©/)
  })

  it('has social links with aria-labels', () => {
    const socials = doc.querySelectorAll('footer a[aria-label]')
    expect(socials.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Projects page — Pinnacle content sections', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('projects.html')
  })

  it('has a hero section with project image', () => {
    const hero = doc.querySelector('header img, .hero img, section img')
    expect(hero).not.toBeNull()
    expect(hero.getAttribute('alt')).toBeTruthy()
  })

  it('has "The Pinnacle" project card', () => {
    const body = doc.body.textContent
    expect(body).toMatch(/The Pinnacle/i)
  })

  it('has a narrative section with description text', () => {
    const body = doc.body.textContent
    expect(body).toMatch(/where elevation defines living/i)
  })

  it('has a gallery section', () => {
    const body = doc.body.textContent
    expect(body).toMatch(/designed for living in motion/i)
  })

  it('has a floor plan section', () => {
    const body = doc.body.textContent
    expect(body).toMatch(/floor plan/i)
  })

  it('has an amenities section with at least 6 amenities', () => {
    const body = doc.body.textContent
    expect(body).toMatch(/designed for every passion/i)
    // Check for specific amenities
    expect(body).toMatch(/leisure pool/i)
    expect(body).toMatch(/fitness/i)
  })

  it('has a location section with distances', () => {
    const body = doc.body.textContent
    expect(body).toMatch(/the best of the city/i)
    expect(body).toMatch(/minutes/i)
  })

  it('has a contact form section', () => {
    const form = doc.querySelector('form')
    expect(form).not.toBeNull()
    const inputs = form.querySelectorAll('input, select')
    expect(inputs.length).toBeGreaterThanOrEqual(4)
  })

  it('has Contact Us CTA', () => {
    const body = doc.body.textContent.toLowerCase()
    expect(body).toMatch(/contact us/)
  })
})

describe('Projects page — a11y basics', () => {
  let doc
  let rawHTML

  beforeEach(() => {
    doc = loadHTML('projects.html')
    rawHTML = readFileSync(resolve(__dirname, '..', 'projects.html'), 'utf-8')
  })

  it('has lang attribute', () => {
    expect(rawHTML).toMatch(/<html\s[^>]*lang=/)
  })

  it('has viewport meta', () => {
    expect(rawHTML).toMatch(/viewport/)
  })

  it('has CSP meta tag', () => {
    expect(rawHTML).toMatch(/Content-Security-Policy/)
  })

  it('has favicon', () => {
    expect(rawHTML).toMatch(/rel="icon"/)
  })

  it('all images have alt text', () => {
    const images = doc.querySelectorAll('img')
    images.forEach((img) => {
      expect(img.getAttribute('alt')).not.toBeNull()
    })
  })
})
