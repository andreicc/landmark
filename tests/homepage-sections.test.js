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

describe('Homepage — Hero Section', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a full-screen hero section', () => {
    const hero = doc.querySelector('.hero')
    expect(hero).not.toBeNull()
    expect(hero.tagName).toBe('SECTION')
  })

  it('hero has an h1 with "Landmark Sanctuary"', () => {
    const h1 = doc.querySelector('.hero h1')
    expect(h1).not.toBeNull()
    expect(h1.textContent).toMatch(/Landmark Sanctuary/i)
  })

  it('hero has a tagline paragraph', () => {
    const p = doc.querySelector('.hero p')
    expect(p).not.toBeNull()
    expect(p.textContent).toMatch(/Spaces Where Life Unfolds/i)
  })

  it('hero has a background image with alt text', () => {
    const img = doc.querySelector('.hero img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('alt')).toBeTruthy()
  })

  it('hero has a CTA button/link', () => {
    const cta = doc.querySelector('.hero .btn, .hero a[href]')
    expect(cta).not.toBeNull()
    expect(cta.textContent).toMatch(/discover/i)
  })
})

describe('Homepage — Art of Detail Section', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has an art-of-detail section', () => {
    const section = doc.querySelector('.art-of-detail')
    expect(section).not.toBeNull()
  })

  it('has a heading with "THE ART" and "DETAIL"', () => {
    const heading = doc.querySelector('.art-of-detail h2')
    expect(heading).not.toBeNull()
    expect(heading.textContent).toMatch(/art/i)
    expect(heading.textContent).toMatch(/detail/i)
  })

  it('has a descriptive paragraph', () => {
    const p = doc.querySelector('.art-of-detail p')
    expect(p).not.toBeNull()
    expect(p.textContent.length).toBeGreaterThan(50)
  })

  it('has a circular image with alt text', () => {
    const img = doc.querySelector('.art-of-detail img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('alt')).toBeTruthy()
  })

  it('has a "Discover More" CTA', () => {
    const cta = doc.querySelector('.art-of-detail .btn, .art-of-detail a')
    expect(cta).not.toBeNull()
    expect(cta.textContent).toMatch(/discover more/i)
  })
})

describe('Homepage — Pillars Section', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a pillars section', () => {
    const section = doc.querySelector('.pillars')
    expect(section).not.toBeNull()
  })

  it('has a subtitle and heading', () => {
    const section = doc.querySelector('.pillars')
    expect(section.textContent).toMatch(/from concept to completion/i)
    expect(section.textContent).toMatch(/defining our pillars/i)
  })

  it('has exactly 3 pillar cards', () => {
    const cards = doc.querySelectorAll('.pillars .pillar-card')
    expect(cards.length).toBe(3)
  })

  it('each pillar card has image, heading, and description', () => {
    const cards = doc.querySelectorAll('.pillars .pillar-card')
    cards.forEach((card) => {
      expect(card.querySelector('img')).not.toBeNull()
      expect(card.querySelector('h4')).not.toBeNull()
      expect(card.querySelector('p')).not.toBeNull()
    })
  })

  it('pillar images have alt text', () => {
    const images = doc.querySelectorAll('.pillars .pillar-card img')
    images.forEach((img) => {
      expect(img.getAttribute('alt')).toBeTruthy()
    })
  })

  it('has pillar titles: Craftsmanship, Thoughtful Design, Signature Quality', () => {
    const headings = doc.querySelectorAll('.pillars .pillar-card h4')
    const titles = Array.from(headings).map((h) => h.textContent.trim())
    expect(titles).toContain('Craftsmanship')
    expect(titles).toContain('Thoughtful Design')
    expect(titles).toContain('Signature Quality')
  })
})

describe('Homepage — Property Showcase Section', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a properties section', () => {
    const section = doc.querySelector('.properties')
    expect(section).not.toBeNull()
  })

  it('has a full-width showcase image', () => {
    const img = doc.querySelector('.properties img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('alt')).toBeTruthy()
  })

  it('has 5 property type icons/items', () => {
    const items = doc.querySelectorAll('.properties .property-type')
    expect(items.length).toBe(5)
  })

  it('has an "Explore All" CTA', () => {
    const cta = doc.querySelector('.properties .btn, .properties a')
    expect(cta).not.toBeNull()
    expect(cta.textContent).toMatch(/explore all/i)
  })
})

describe('Homepage — Press Releases Section', () => {
  let doc

  beforeEach(() => {
    doc = loadHTML('index.html')
  })

  it('has a press section', () => {
    const section = doc.querySelector('.press')
    expect(section).not.toBeNull()
  })

  it('has a "Press Releases" heading', () => {
    const heading = doc.querySelector('.press h2')
    expect(heading).not.toBeNull()
    expect(heading.textContent).toMatch(/press releases/i)
  })

  it('has at least 3 press articles', () => {
    const articles = doc.querySelectorAll('.press article, .press .press-card')
    expect(articles.length).toBeGreaterThanOrEqual(3)
  })

  it('each article has a heading and date', () => {
    const articles = doc.querySelectorAll('.press article, .press .press-card')
    articles.forEach((article) => {
      expect(article.querySelector('h3, h4')).not.toBeNull()
      expect(article.querySelector('time, .press-date')).not.toBeNull()
    })
  })

  it('has a "View All" CTA', () => {
    const cta = doc.querySelector('.press .btn, .press .btn--outline, .press a.btn, .press a[href]')
    expect(cta).not.toBeNull()
    expect(cta.textContent).toMatch(/view all/i)
  })
})
