import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'
import { INTERESTS, REASONS, LIMITS } from '../lib/lead-fields.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const read = (p) => readFileSync(resolve(root, p), 'utf-8')
const load = (p) => new JSDOM(read(p)).window.document

const CLIENT = read('public/js/lead-form.js')

// Every page carrying an enquiry form, with the form it carries.
const FORM_PAGES = [
  { page: 'index.html', id: 'homeForm', source: 'homepage' },
  { page: 'ro/index.html', id: 'homeForm', source: 'homepage' },
  { page: 'projects.html', id: 'inquiryForm', source: 'projects' },
  { page: 'ro/projects.html', id: 'inquiryForm', source: 'projects' },
  { page: 'contact.html', id: 'contactForm', source: 'contact' },
  { page: 'ro/contact.html', id: 'contactForm', source: 'contact' },
]

describe('Enquiry forms — wiring', () => {
  FORM_PAGES.forEach(({ page, id, source }) => {
    describe(`${page} #${id}`, () => {
      let doc
      let form

      beforeEach(() => {
        doc = load(page)
        form = doc.getElementById(id)
      })

      it('exists and declares which form it is', () => {
        expect(form).not.toBeNull()
        expect(form.dataset.leadForm).toBe(source)
      })

      it('loads the shared submit script', () => {
        expect(read(page)).toContain('/js/lead-form.js')
      })

      it('points at success and error blocks that actually exist', () => {
        // The client resolves these by id at runtime, where a typo would be
        // silent — the form would send and then look like it had failed.
        for (const key of ['success', 'error']) {
          const target = form.dataset[key]
          expect(target, `data-${key} is not set`).toBeTruthy()
          expect(doc.getElementById(target), `#${target} is missing`).not.toBeNull()
        }
      })

      it('starts with both outcome blocks hidden', () => {
        expect(doc.getElementById(form.dataset.success).className).toContain('hidden')
        expect(doc.getElementById(form.dataset.error).className).toContain('hidden')
      })

      it('announces the error block to screen readers', () => {
        expect(doc.getElementById(form.dataset.error).getAttribute('role')).toBe('alert')
      })

      it('carries localised strings for the states only JS can render', () => {
        expect(form.dataset.sending).toBeTruthy()
        expect(form.dataset.offline).toBeTruthy()
        // The fallback address has to survive the server being unreachable.
        expect(form.dataset.offline).toContain('ioana@landmark.com.ro')
      })
    })
  })
})

describe('Enquiry forms — every field reaches the server', () => {
  FORM_PAGES.forEach(({ page, id }) => {
    describe(`${page} #${id}`, () => {
      let form

      beforeEach(() => {
        form = load(page).getElementById(id)
      })

      // The regression this file exists for: all three forms once shipped with
      // ids but no name attributes, so every submission would have arrived
      // empty even once a backend existed.
      it('names every input, select and textarea', () => {
        const fields = form.querySelectorAll('input, select, textarea')
        expect(fields.length).toBeGreaterThan(4)
        fields.forEach((field) => {
          expect(
            field.getAttribute('name'),
            `${field.tagName} #${field.id || '(no id)'} has no name`,
          ).toBeTruthy()
        })
      })

      it('uses only names the client actually reads', () => {
        const names = new Set(
          Array.from(form.querySelectorAll('[name]')).map((f) => f.getAttribute('name')),
        )
        names.forEach((name) => {
          expect(CLIENT, `client never reads "${name}"`).toContain(`'${name}'`)
        })
      })

      it('requires consent before anything can be sent', () => {
        const consent = form.querySelector('[name="consent"]')
        expect(consent).not.toBeNull()
        expect(consent.type).toBe('checkbox')
        // GDPR: this was optional on two of the three forms.
        expect(consent.hasAttribute('required')).toBe(true)
      })

      it('caps the message at the length the server enforces', () => {
        const message = form.querySelector('[name="message"]')
        if (!message) return
        expect(Number(message.getAttribute('maxlength'))).toBe(LIMITS.message)
      })

      it('gives every visible field an accessible name', () => {
        const doc = load(page)
        form.querySelectorAll('input, select, textarea').forEach((field) => {
          if (field.closest('.lead-trap')) return
          if (field.type === 'hidden' || field.type === 'radio') return
          const named =
            field.getAttribute('aria-label') ||
            field.closest('label') ||
            (field.id && doc.querySelector(`label[for="${field.id}"]`))
          expect(named, `${field.getAttribute('name')} has no label`).toBeTruthy()
        })
      })
    })
  })
})

describe('Enquiry forms — honeypot', () => {
  FORM_PAGES.forEach(({ page, id }) => {
    it(`${page} #${id} hides a trap field from humans and assistive tech`, () => {
      const form = load(page).getElementById(id)
      const trap = form.querySelector('.lead-trap')
      expect(trap).not.toBeNull()
      expect(trap.getAttribute('aria-hidden')).toBe('true')
      const input = trap.querySelector('input[name="company"]')
      expect(input).not.toBeNull()
      expect(input.getAttribute('tabindex')).toBe('-1')
      expect(input.getAttribute('autocomplete')).toBe('off')
    })
  })

  it('is positioned off-screen rather than display:none, which bots skip', () => {
    FORM_PAGES.forEach(({ page }) => {
      expect(read(page)).toMatch(/\.lead-trap\s*\{[^}]*left:\s*-9999px/)
    })
  })
})

describe('Enquiry forms — dropdown inventory', () => {
  FORM_PAGES.forEach(({ page, id }) => {
    it(`${page} #${id} offers only residences the server recognises`, () => {
      const form = load(page).getElementById(id)
      const select = form.querySelector('select[name="interest"]')
      expect(select).not.toBeNull()
      const values = Array.from(select.options).map((o) => o.value)
      expect(values.length).toBeGreaterThan(1)
      values.forEach((value) => {
        expect(INTERESTS[value], `unknown interest slug "${value}"`).toBeTruthy()
      })
    })

    it(`${page} #${id} labels every option`, () => {
      const select = load(page).getElementById(id).querySelector('select[name="interest"]')
      Array.from(select.options).forEach((o) => expect(o.textContent.trim()).toBeTruthy())
    })
  })

  it('offers only reasons the server recognises', () => {
    ;['contact.html', 'ro/contact.html'].forEach((page) => {
      const form = load(page).getElementById('contactForm')
      Array.from(form.querySelectorAll('[name="reason"]')).forEach((radio) => {
        expect(REASONS[radio.value], `unknown reason "${radio.value}"`).toBeTruthy()
      })
    })
  })

  // Earlier passes stripped invented prices, an invented amenity deck and an
  // invented unit count. These two invented developments survived in the
  // dropdowns and footers because nothing pointed a test at them.
  it('names no development that does not exist', () => {
    const pages = [...new Set(FORM_PAGES.map((f) => f.page))]
    pages.forEach((page) => {
      const text = read(page)
      expect(text, `${page} still names The Willows`).not.toMatch(/Willows/)
      expect(text, `${page} still names The Grove`).not.toMatch(/The Grove/)
    })
  })
})

describe('Enquiry forms — no faked success', () => {
  // Every form used to call preventDefault() and reveal its success block
  // without sending anything anywhere.
  FORM_PAGES.forEach(({ page, id }) => {
    it(`${page} has no inline handler shortcutting #${id}`, () => {
      const raw = read(page)
      expect(raw).not.toMatch(new RegExp(`getElementById\\('${id}'\\)\\.addEventListener`))
    })
  })

  it('the client posts to the real endpoint', () => {
    expect(CLIENT).toContain("fetch('/api/inquiry'")
    expect(CLIENT).toContain("method: 'POST'")
  })

  it('the client only reveals success after the server confirmed it', () => {
    // Guards the ordering: the success branch must sit behind an ok check.
    const successIndex = CLIENT.indexOf("success.classList.remove('hidden')")
    const guardIndex = CLIENT.indexOf('!result.ok')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(successIndex).toBeGreaterThan(guardIndex)
  })
})
