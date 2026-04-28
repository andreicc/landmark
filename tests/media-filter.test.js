import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function bootMediaPage(filepath) {
  const html = readFileSync(resolve(root, filepath), 'utf-8')
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true })
  return dom.window
}

const pages = [
  { path: 'media.html', label: 'EN' },
  { path: 'ro/media.html', label: 'RO' },
]

describe('Media page filter chips wire posts by data-tag', () => {
  pages.forEach(({ path, label }) => {
    describe(`${label} (${path})`, () => {
      let win, doc

      beforeEach(() => {
        win = bootMediaPage(path)
        doc = win.document
      })

      it('has filter chips with data-filter attributes', () => {
        const chips = doc.querySelectorAll('[data-filter]')
        expect(chips.length).toBeGreaterThanOrEqual(7)
      })

      it('every post has a data-tag matching one of the filter values', () => {
        const filterValues = new Set(
          Array.from(doc.querySelectorAll('[data-filter]')).map((b) => b.dataset.filter),
        )
        filterValues.delete('all')
        const posts = doc.querySelectorAll('[data-post]')
        expect(posts.length).toBeGreaterThan(0)
        posts.forEach((p) => {
          expect(filterValues.has(p.dataset.tag)).toBe(true)
        })
      })

      it('clicking a non-"all" filter hides posts whose data-tag does not match', () => {
        const pressBtn = doc.querySelector('[data-filter="press"]')
        expect(pressBtn).not.toBeNull()
        pressBtn.click()
        const posts = Array.from(doc.querySelectorAll('[data-post]'))
        const visible = posts.filter((p) => !p.hidden)
        const hidden = posts.filter((p) => p.hidden)
        expect(visible.length).toBeGreaterThan(0)
        expect(hidden.length).toBeGreaterThan(0)
        visible.forEach((p) => expect(p.dataset.tag).toBe('press'))
      })

      it('clicking "all" after a filter shows every post again', () => {
        const craftBtn = doc.querySelector('[data-filter="craft"]')
        const allBtn = doc.querySelector('[data-filter="all"]')
        craftBtn.click()
        allBtn.click()
        const posts = Array.from(doc.querySelectorAll('[data-post]'))
        posts.forEach((p) => expect(p.hidden).toBe(false))
      })

      it('updates #postCount to reflect visible posts after filtering', () => {
        const peopleBtn = doc.querySelector('[data-filter="people"]')
        peopleBtn.click()
        const visibleCount = Array.from(doc.querySelectorAll('[data-post]')).filter((p) => !p.hidden).length
        const countEl = doc.getElementById('postCount')
        expect(countEl).not.toBeNull()
        expect(parseInt(countEl.textContent, 10)).toBe(visibleCount)
      })

      it('toggles is-active class on the clicked filter chip', () => {
        const milestoneBtn = doc.querySelector('[data-filter="milestone"]')
        milestoneBtn.click()
        expect(milestoneBtn.classList.contains('is-active')).toBe(true)
        const otherActive = Array.from(doc.querySelectorAll('[data-filter].is-active')).filter(
          (b) => b !== milestoneBtn,
        )
        expect(otherActive.length).toBe(0)
      })
    })
  })
})
