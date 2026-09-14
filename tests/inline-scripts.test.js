import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const ALL_PAGES = ['index.html', 'about.html', 'contact.html', 'projects.html', 'media.html'].flatMap(
  (p) => [p, `ro/${p}`],
)

function readRaw(filepath) {
  return readFileSync(resolve(root, filepath), 'utf-8')
}

function loadHTML(filepath) {
  return new JSDOM(readRaw(filepath)).window.document
}

// Every page carries its behaviour in inline <script> blocks in the same file as
// the markup, so a renamed id breaks the page silently — there is no build step
// or type checker between the two. These tests are that missing link.
function inlineScript(filepath) {
  const raw = readRaw(filepath)
  const blocks = [...raw.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  )
  return blocks
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '') // about.html parks a retired timeline in a block comment
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('Inline scripts — element contract', () => {
  ALL_PAGES.forEach((page) => {
    it(`${page}: every getElementById target exists`, () => {
      const doc = loadHTML(page)
      const ids = [
        ...new Set(
          [...inlineScript(page).matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]),
        ),
      ]
      expect(ids.length).toBeGreaterThan(0)
      const missing = ids.filter((id) => !doc.getElementById(id))
      expect(missing, `${page} scripts reference missing ids`).toEqual([])
    })

    it(`${page}: ids used by scripts are unique in the document`, () => {
      const doc = loadHTML(page)
      const ids = [
        ...new Set(
          [...inlineScript(page).matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]),
        ),
      ]
      ids.forEach((id) => {
        expect(doc.querySelectorAll(`[id="${id}"]`).length, `#${id} is duplicated`).toBe(1)
      })
    })
  })
})

describe('Inline scripts — EN and RO stay in sync', () => {
  ;['index.html', 'about.html', 'contact.html', 'projects.html', 'media.html'].forEach((page) => {
    it(`${page} and ro/${page} drive the same element ids`, () => {
      const idsOf = (p) =>
        [
          ...new Set(
            [...inlineScript(p).matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]),
          ),
        ].sort()
      // A behaviour added to one locale but not the other is the single most
      // common way these mirrored pages drift apart.
      expect(idsOf(`ro/${page}`)).toEqual(idsOf(page))
    })
  })
})

describe('Interactive elements have accessible names', () => {
  ALL_PAGES.forEach((page) => {
    it(`${page}: every button is named`, () => {
      const buttons = loadHTML(page).querySelectorAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((btn) => {
        const named = btn.getAttribute('aria-label') || btn.textContent.trim()
        expect(named, `a <button> on ${page} has no accessible name`).toBeTruthy()
      })
    })

    it(`${page}: every link is named`, () => {
      const links = loadHTML(page).querySelectorAll('a')
      expect(links.length).toBeGreaterThan(0)
      links.forEach((link) => {
        const named =
          link.textContent.trim() ||
          link.getAttribute('aria-label') ||
          link.querySelector('img[alt]')?.getAttribute('alt')
        expect(named, `${link.getAttribute('href')} on ${page} has no accessible name`).toBeTruthy()
      })
    })
  })
})
