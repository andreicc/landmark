import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const PROJECT_PAGES = ['projects.html', 'ro/projects.html']

function loadHTML(filepath) {
  return new JSDOM(readFileSync(resolve(root, filepath), 'utf-8')).window.document
}

// Shared header/footer/CSP coverage lives in header-footer.test.js; this file
// covers what is specific to the Landmark 4 project page.
describe('Projects page — structure', () => {
  PROJECT_PAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('has the twelve content sections', () => {
        expect(doc.querySelectorAll('main section').length).toBe(12)
      })

      it('anchors the five deep-linkable sections', () => {
        const ids = Array.from(doc.querySelectorAll('main section[id]')).map((s) => s.id)
        expect(ids).toEqual(['residences', 'gallery', 'plan', 'location', 'inquiry'])
      })

      it('has exactly one h1, naming the project', () => {
        const h1s = doc.querySelectorAll('h1')
        expect(h1s.length).toBe(1)
        expect(h1s[0].textContent).toMatch(/Landmark 4/)
      })
    })
  })
})

describe('Projects page — hero', () => {
  PROJECT_PAGES.forEach((page) => {
    it(`${page} serves the hero responsively with alt text`, () => {
      const doc = loadHTML(page)
      const source = doc.querySelector('section picture source[type="image/webp"]')
      expect(source).not.toBeNull()
      expect(source.getAttribute('srcset')).toMatch(/2560w/)
      const img = doc.querySelector('section picture img')
      expect(img.getAttribute('alt')).toBeTruthy()
      expect(img.getAttribute('fetchpriority')).toBe('high')
    })
  })
})

describe('Projects page — gallery', () => {
  PROJECT_PAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('renders every render through <picture> with a webp srcset', () => {
        const pictures = doc.querySelectorAll('#gallery picture')
        expect(pictures.length).toBeGreaterThanOrEqual(6)
        pictures.forEach((pic) => {
          const source = pic.querySelector('source[type="image/webp"]')
          expect(source, 'gallery picture without a webp source').not.toBeNull()
          expect(source.getAttribute('srcset')).toMatch(/\d+w/)
        })
      })

      it('lazy-loads gallery images and gives each alt text', () => {
        const imgs = doc.querySelectorAll('#gallery picture img')
        expect(imgs.length).toBeGreaterThanOrEqual(6)
        imgs.forEach((img) => {
          expect(img.getAttribute('loading')).toBe('lazy')
          expect(img.getAttribute('alt')).toBeTruthy()
        })
      })

      it('points the lightbox at optimized renders, never the originals', () => {
        const raw = readFileSync(resolve(root, page), 'utf-8')
        // The lightbox builds its srcset by string concatenation at runtime.
        expect(raw).toMatch(/\/renders\/landmark-4\//)
        expect(raw).not.toMatch(/\/raw\//)
      })
    })
  })
})

describe('Projects page — content sections', () => {
  PROJECT_PAGES.forEach((page) => {
    describe(page, () => {
      let text

      beforeEach(() => {
        text = loadHTML(page).body.textContent.replace(/\s+/g, ' ')
      })

      it('describes the residence typologies', () => {
        expect(text).toMatch(/typolog/i)
      })

      it('describes the ground floor rather than an amenity deck', () => {
        // The building has no residents' amenity floor — only ground-floor
        // commercial and planted open ground. The page used to claim a 7,000 m²
        // spa deck on a 19th floor that does not exist in a 12-floor tower.
        expect(text).toMatch(/comercial|commercial/i)
        expect(text).not.toMatch(/Sky Pool|Nordic Spa|Technogym|Screening Room/i)
      })

      it('locates the project and quotes travel times', () => {
        expect(text).toMatch(/Băneasa/i)
        expect(text).toMatch(/minute/i)
      })
    })
  })
})

describe('Projects page — enquiry form', () => {
  PROJECT_PAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('has the enquiry form with its fields', () => {
        const form = doc.querySelector('#inquiryForm')
        expect(form).not.toBeNull()
        expect(form.querySelectorAll('input, select, textarea').length).toBeGreaterThanOrEqual(4)
      })

      it('gives every field an accessible name', () => {
        const fields = doc.querySelectorAll(
          '#inquiryForm input, #inquiryForm select, #inquiryForm textarea',
        )
        expect(fields.length).toBeGreaterThan(0)
        fields.forEach((field) => {
          if (field.type === 'hidden') return
          const id = field.getAttribute('id')
          const named =
            field.getAttribute('aria-label') ||
            field.getAttribute('placeholder') ||
            field.closest('label') ||
            (id && doc.querySelector(`label[for="${id}"]`))
          expect(named, `field ${field.name || field.type} has no accessible name`).toBeTruthy()
        })
      })
    })
  })
})

describe('Projects page — a11y basics', () => {
  PROJECT_PAGES.forEach((page) => {
    it(`${page} gives every image alt text`, () => {
      const imgs = loadHTML(page).querySelectorAll('img')
      expect(imgs.length).toBeGreaterThan(0)
      imgs.forEach((img) => {
        expect(img.getAttribute('alt'), `${img.getAttribute('src')} has no alt`).not.toBeNull()
      })
    })
  })
})
