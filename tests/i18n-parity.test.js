import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadDoc(filepath) {
  const html = readFileSync(resolve(root, filepath), 'utf-8')
  return new JSDOM(html).window.document
}

const pairs = [
  { en: 'index.html', ro: 'ro/index.html', label: 'home' },
  { en: 'about.html', ro: 'ro/about.html', label: 'about' },
  { en: 'projects.html', ro: 'ro/projects.html', label: 'projects' },
  { en: 'contact.html', ro: 'ro/contact.html', label: 'contact' },
  { en: 'media.html', ro: 'ro/media.html', label: 'media' },
]

describe('EN/RO structural parity', () => {
  pairs.forEach(({ en, ro, label }) => {
    describe(`${label}: ${en} <-> ${ro}`, () => {
      it('RO page exists', () => {
        expect(existsSync(resolve(root, ro))).toBe(true)
      })

      it('RO has lang="ro"', () => {
        const doc = loadDoc(ro)
        expect(doc.documentElement.getAttribute('lang')).toBe('ro')
      })

      it('EN and RO have the same <section> count', () => {
        const enCount = loadDoc(en).querySelectorAll('section').length
        const roCount = loadDoc(ro).querySelectorAll('section').length
        expect(roCount).toBe(enCount)
      })

      it('EN and RO have the same h1 count', () => {
        const enCount = loadDoc(en).querySelectorAll('h1').length
        const roCount = loadDoc(ro).querySelectorAll('h1').length
        expect(roCount).toBe(enCount)
      })

      it('EN and RO have the same h2 count', () => {
        const enCount = loadDoc(en).querySelectorAll('h2').length
        const roCount = loadDoc(ro).querySelectorAll('h2').length
        expect(roCount).toBe(enCount)
      })

      it('EN and RO reference the same image assets', () => {
        const enImgs = Array.from(loadDoc(en).querySelectorAll('img')).map((i) => i.getAttribute('src')).sort()
        const roImgs = Array.from(loadDoc(ro).querySelectorAll('img')).map((i) => i.getAttribute('src')).sort()
        expect(roImgs).toEqual(enImgs)
      })

      it('RO has hreflang alternate pointing to EN', () => {
        const doc = loadDoc(ro)
        const en = doc.querySelector('link[rel="alternate"][hreflang="en"]')
        expect(en).not.toBeNull()
      })

      it('RO has language switcher linking back to EN', () => {
        const doc = loadDoc(ro)
        const switcher = doc.querySelector('[data-lang-switcher]')
        expect(switcher).not.toBeNull()
        const enLink = switcher.querySelector('a[hreflang="en"]')
        expect(enLink).not.toBeNull()
      })
    })
  })
})

// Romanian pages repeatedly shipped English copy left over from the template —
// whole founder bios, hero paragraphs, form confirmations. This locks the
// cleanup in: no visible RO string may be byte-identical to its EN counterpart.
//
// Post cards on /media are excluded: they hold fixture content that the CMS
// replaces at build time, so their copy is not translated by hand.
describe('Romanian pages carry Romanian copy', () => {
  const FUNCTION_WORDS =
    /\b(the|and|of|with|for|from|your|our|is|are|to|in|on|at|by|we|you|that|this|it|as|be|have|has|will|would|can|not|but|they|their|its|a|an)\b/i

  function visibleText(filepath) {
    const doc = loadDoc(filepath)
    doc.querySelectorAll('script,style,svg,noscript').forEach((el) => el.remove())
    const out = []
    const walker = doc.createTreeWalker(doc.body, 4 /* TEXT_NODE */)
    let node
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('[data-post]')) continue
      const text = node.textContent.replace(/\s+/g, ' ').trim()
      if (text.length > 18) out.push(text)
    }
    return out
  }

  ;['index.html', 'about.html', 'projects.html', 'contact.html', 'media.html'].forEach((page) => {
    it(`ro/${page} has no untranslated English copy`, () => {
      const en = new Set(visibleText(page))
      const untranslated = visibleText(`ro/${page}`).filter(
        (t) => en.has(t) && FUNCTION_WORDS.test(t),
      )
      expect(untranslated).toEqual([])
    })
  })
})
