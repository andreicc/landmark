import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const HOMEPAGES = ['index.html', 'ro/index.html']

function loadHTML(filepath) {
  return new JSDOM(readFileSync(resolve(root, filepath), 'utf-8')).window.document
}

function readRaw(filepath) {
  return readFileSync(resolve(root, filepath), 'utf-8')
}

describe('Homepage — section inventory', () => {
  HOMEPAGES.forEach((page) => {
    it(`${page} ships the seven top-level sections`, () => {
      const sections = loadHTML(page).querySelectorAll('main section')
      expect(sections.length).toBe(7)
    })

    it(`${page} anchors hero, pillars, journal and contact by id`, () => {
      const doc = loadHTML(page)
      ;['hero', 'pillars', 'journal', 'contact'].forEach((id) => {
        const el = doc.querySelector(`section#${id}`)
        expect(el, `section#${id} missing`).not.toBeNull()
      })
    })
  })
})

describe('Homepage — hero', () => {
  HOMEPAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('is a full-screen section with the single h1', () => {
        const hero = doc.querySelector('section#hero')
        expect(hero.className).toMatch(/h-screen/)
        expect(doc.querySelectorAll('h1').length).toBe(1)
        expect(hero.querySelector('h1').textContent.trim()).toMatch(/Landmark 4/)
      })

      it('serves the hero photo responsively, not as a single original', () => {
        const source = doc.querySelector('#hero picture source[type="image/webp"]')
        expect(source).not.toBeNull()
        const srcset = source.getAttribute('srcset')
        expect(srcset).toMatch(/800w/)
        expect(srcset).toMatch(/2560w/)
        expect(source.getAttribute('sizes')).toBe('100vw')
      })

      it('prioritises the hero image for LCP and gives it alt text', () => {
        const img = doc.querySelector('#hero picture img')
        expect(img).not.toBeNull()
        expect(img.getAttribute('fetchpriority')).toBe('high')
        expect(img.getAttribute('loading')).toBe('eager')
        expect(img.getAttribute('alt')).toBeTruthy()
      })

      it('offers two calls to action', () => {
        const links = doc.querySelectorAll('#hero a[href]')
        expect(links.length).toBeGreaterThanOrEqual(2)
        const hrefs = Array.from(links).map((a) => a.getAttribute('href'))
        expect(hrefs.some((h) => /projects/.test(h))).toBe(true)
      })
    })
  })
})

describe('Homepage — pillars carousel', () => {
  HOMEPAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('has exactly three pillars', () => {
        const dots = doc.querySelectorAll('#pillarDots button')
        expect(dots.length).toBe(3)
      })

      it('each pillar has a heading and body copy', () => {
        const headings = doc.querySelectorAll('#pillarSlides h3')
        expect(headings.length).toBe(3)
        headings.forEach((h) => expect(h.textContent.trim().length).toBeGreaterThan(0))

        const paras = doc.querySelectorAll('#pillarSlides p')
        expect(paras.length).toBeGreaterThanOrEqual(3)
      })

      it('has labelled previous and next controls', () => {
        const prev = doc.querySelector('#pillarPrev')
        const next = doc.querySelector('#pillarNext')
        expect(prev).not.toBeNull()
        expect(next).not.toBeNull()
        expect(prev.getAttribute('aria-label')).toBeTruthy()
        expect(next.getAttribute('aria-label')).toBeTruthy()
      })

      it('shows a position counter', () => {
        expect(doc.querySelector('#pillarNum')).not.toBeNull()
      })
    })
  })
})

describe('Homepage — journal feed', () => {
  HOMEPAGES.forEach((page) => {
    describe(page, () => {
      it('has the CMS-backed grid container', () => {
        expect(loadHTML(page).querySelector('#homeJournalGrid')).not.toBeNull()
      })

      it('keeps the build-time substitution marker', () => {
        // vite.config.js latestJournalCards() replaces this marker with the
        // latest three posts rendered by scripts/build-media.mjs. Losing the
        // marker silently drops the journal section from the built page.
        expect(readRaw(page)).toContain('<!-- LATEST_JOURNAL -->')
      })
    })
  })
})

describe('Homepage — contact register', () => {
  HOMEPAGES.forEach((page) => {
    describe(page, () => {
      let doc

      beforeEach(() => {
        doc = loadHTML(page)
      })

      it('has the enquiry form with its fields', () => {
        const form = doc.querySelector('#homeForm')
        expect(form).not.toBeNull()
        const fields = form.querySelectorAll('input, select, textarea')
        expect(fields.length).toBeGreaterThanOrEqual(4)
      })

      it('gives every field an accessible name', () => {
        const fields = doc.querySelectorAll('#homeForm input, #homeForm select, #homeForm textarea')
        expect(fields.length).toBeGreaterThan(0)
        fields.forEach((field) => {
          if (field.type === 'hidden') return
          const id = field.getAttribute('id')
          const named =
            field.getAttribute('aria-label') ||
            field.getAttribute('placeholder') ||
            // A label may either point at the control or wrap it; the consent
            // checkbox uses the wrapping form.
            field.closest('label') ||
            (id && doc.querySelector(`label[for="${id}"]`))
          expect(named, `field ${field.name || field.type} has no accessible name`).toBeTruthy()
        })
      })

      it('has a success panel to reveal after submit', () => {
        expect(doc.querySelector('#homeFormSuccess')).not.toBeNull()
      })
    })
  })
})

describe('Homepage — images', () => {
  HOMEPAGES.forEach((page) => {
    it(`${page} gives every image alt text`, () => {
      const imgs = loadHTML(page).querySelectorAll('img')
      expect(imgs.length).toBeGreaterThan(0)
      imgs.forEach((img) => {
        expect(img.getAttribute('alt'), `${img.getAttribute('src')} has no alt`).not.toBeNull()
      })
    })

    it(`${page} lazy-loads everything below the hero`, () => {
      const doc = loadHTML(page)
      const belowFold = Array.from(doc.querySelectorAll('img')).filter(
        (img) => !img.closest('#hero'),
      )
      belowFold.forEach((img) => {
        expect(['lazy', null]).toContain(img.getAttribute('loading'))
      })
    })
  })
})
