import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function createDOM() {
  const html = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf-8')
  return new JSDOM(html).window.document
}

describe('Mobile navigation toggle', () => {
  let doc

  beforeEach(() => {
    doc = createDOM()
  })

  it('toggle button exists with aria-expanded="false"', () => {
    const btn = doc.querySelector('[data-menu-toggle]')
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.getAttribute('aria-label')).toBeTruthy()
  })

  it('toggle button is inside header', () => {
    const btn = doc.querySelector('header [data-menu-toggle]')
    expect(btn).not.toBeNull()
  })
})

describe('Interactive elements have accessible labels', () => {
  let doc

  beforeEach(() => {
    doc = createDOM()
  })

  it('icon buttons have aria-labels', () => {
    const iconButtons = doc.querySelectorAll('button')
    iconButtons.forEach((btn) => {
      const hasLabel = btn.getAttribute('aria-label')
      const hasText = btn.textContent.trim().length > 0
      expect(hasLabel || hasText).toBeTruthy()
    })
  })

  it('pillar cards have hover animation containers', () => {
    const pillars = doc.querySelectorAll('.pillar-image-container')
    expect(pillars.length).toBe(3)
  })

  it('pillar images have alt text', () => {
    const imgs = doc.querySelectorAll('.pillar-image-container img')
    imgs.forEach((img) => {
      expect(img.getAttribute('alt')).toBeTruthy()
    })
  })
})
