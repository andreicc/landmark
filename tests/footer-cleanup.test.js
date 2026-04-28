import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadFooter(filepath) {
  const html = readFileSync(resolve(root, filepath), 'utf-8')
  return new JSDOM(html).window.document.querySelector('footer')
}

const enPages = ['index.html', 'about.html', 'projects.html', 'contact.html', 'media.html']
const roPages = ['ro/index.html', 'ro/about.html', 'ro/projects.html', 'ro/contact.html', 'ro/media.html']

describe('Footer cleanup — Communities & Careers removed (parity with top nav)', () => {
  describe('EN pages', () => {
    enPages.forEach((page) => {
      describe(page, () => {
        it('has no "All Communities" link', () => {
          const footer = loadFooter(page)
          const links = Array.from(footer.querySelectorAll('a')).map((a) => a.textContent.trim().toLowerCase())
          expect(links).not.toContain('all communities')
        })

        it('has no "Careers" link', () => {
          const footer = loadFooter(page)
          const links = Array.from(footer.querySelectorAll('a')).map((a) => a.textContent.trim().toLowerCase())
          expect(links).not.toContain('careers')
        })

        it('has no "Communities" column heading', () => {
          const footer = loadFooter(page)
          const headings = Array.from(footer.querySelectorAll('h5')).map((h) => h.textContent.trim().toLowerCase())
          expect(headings).not.toContain('communities')
        })
      })
    })
  })

  describe('RO pages', () => {
    roPages.forEach((page) => {
      describe(page, () => {
        it('has no "Toate Comunitățile" / "Comunități" link', () => {
          const footer = loadFooter(page)
          const links = Array.from(footer.querySelectorAll('a')).map((a) => a.textContent.trim().toLowerCase())
          expect(links).not.toContain('toate comunitățile')
          expect(links).not.toContain('comunități')
        })

        it('has no "Cariere" link', () => {
          const footer = loadFooter(page)
          const links = Array.from(footer.querySelectorAll('a')).map((a) => a.textContent.trim().toLowerCase())
          expect(links).not.toContain('cariere')
        })

        it('has no "Comunități" column heading', () => {
          const footer = loadFooter(page)
          const headings = Array.from(footer.querySelectorAll('h5')).map((h) => h.textContent.trim().toLowerCase())
          expect(headings).not.toContain('comunități')
        })
      })
    })
  })
})
