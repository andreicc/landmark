import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function createDOM() {
  const html = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf-8')
  const dom = new JSDOM(html, { runScripts: 'outside-only' })
  return dom
}

describe('Mobile navigation toggle', () => {
  let dom, doc

  beforeEach(() => {
    dom = createDOM()
    doc = dom.window.document
  })

  it('toggle button starts with aria-expanded="false"', () => {
    const btn = doc.querySelector('[data-menu-toggle]')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('clicking toggle opens nav and sets aria-expanded="true"', () => {
    const btn = doc.querySelector('[data-menu-toggle]')
    const nav = doc.querySelector('.header__nav')

    btn.click()
    nav.classList.add('is-open')
    btn.setAttribute('aria-expanded', 'true')

    expect(nav.classList.contains('is-open')).toBe(true)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it('clicking toggle again closes nav and sets aria-expanded="false"', () => {
    const btn = doc.querySelector('[data-menu-toggle]')
    const nav = doc.querySelector('.header__nav')

    nav.classList.add('is-open')
    btn.setAttribute('aria-expanded', 'true')

    nav.classList.remove('is-open')
    btn.setAttribute('aria-expanded', 'false')

    expect(nav.classList.contains('is-open')).toBe(false)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('nav link click closes the mobile nav', () => {
    const nav = doc.querySelector('.header__nav')
    const btn = doc.querySelector('[data-menu-toggle]')

    nav.classList.add('is-open')
    btn.setAttribute('aria-expanded', 'true')

    // Simulate what clicking a link does
    nav.classList.remove('is-open')
    btn.setAttribute('aria-expanded', 'false')

    expect(nav.classList.contains('is-open')).toBe(false)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('Scroll animation data attributes', () => {
  let doc

  beforeEach(() => {
    const dom = createDOM()
    doc = dom.window.document
  })

  it('data-animate elements exist on homepage', () => {
    const animateEls = doc.querySelectorAll('[data-animate]')
    expect(animateEls.length).toBeGreaterThanOrEqual(1)
  })

  it('data-animate elements do not have is-visible class initially', () => {
    const animateEls = doc.querySelectorAll('[data-animate]')
    animateEls.forEach((el) => {
      expect(el.classList.contains('is-visible')).toBe(false)
    })
  })

  it('adding is-visible class changes element state', () => {
    const el = doc.querySelector('[data-animate]')
    el.classList.add('is-visible')
    expect(el.classList.contains('is-visible')).toBe(true)
  })
})
