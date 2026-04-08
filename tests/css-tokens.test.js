import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readCSS(filename) {
  return readFileSync(resolve(__dirname, '..', 'src', 'css', filename), 'utf-8')
}

function extractRootBlock(css) {
  const match = css.match(/:root\s*\{([^}]+)\}/s)
  return match ? match[1] : ''
}

describe('CSS Design Tokens (variables.css) — Stitch', () => {
  let root

  beforeAll(() => {
    const css = readCSS('variables.css')
    root = extractRootBlock(css)
  })

  it('defines primary color as landmark green (#004225)', () => {
    expect(root).toMatch(/--color-primary:\s*#004225/)
  })

  it('defines accent/gold color (#b59458)', () => {
    expect(root).toMatch(/--color-accent:\s*#b59458/)
  })

  it('defines on-primary (white text on green)', () => {
    expect(root).toMatch(/--color-on-primary:\s*#[0-9a-fA-F]{3,8}/)
  })

  it('defines background and surface colors', () => {
    expect(root).toMatch(/--color-bg:\s*#[0-9a-fA-F]{3,8}/)
    expect(root).toMatch(/--color-surface:\s*#f9f8f6/)
  })

  it('defines text colors (on-background, secondary)', () => {
    expect(root).toMatch(/--color-text:\s*#1b1c1c/)
    expect(root).toMatch(/--color-text-secondary:\s*#5f5e5e/)
  })

  it('defines outline colors', () => {
    expect(root).toMatch(/--color-outline:\s*#[0-9a-fA-F]{3,8}/)
  })

  it('defines heading font as Lato', () => {
    expect(root).toMatch(/--font-heading:.*Lato/)
  })

  it('defines body font as Roboto', () => {
    expect(root).toMatch(/--font-body:.*Roboto/)
  })

  it('defines font size scale', () => {
    expect(root).toMatch(/--text-sm:/)
    expect(root).toMatch(/--text-base:/)
    expect(root).toMatch(/--text-lg:/)
    expect(root).toMatch(/--text-xl:/)
    expect(root).toMatch(/--text-2xl:/)
    expect(root).toMatch(/--text-3xl:/)
    expect(root).toMatch(/--text-4xl:/)
  })

  it('defines spacing scale', () => {
    expect(root).toMatch(/--space-xs:/)
    expect(root).toMatch(/--space-sm:/)
    expect(root).toMatch(/--space-md:/)
    expect(root).toMatch(/--space-lg:/)
    expect(root).toMatch(/--space-xl:/)
    expect(root).toMatch(/--space-2xl:/)
  })

  it('defines container max-width', () => {
    expect(root).toMatch(/--container-max:/)
  })

  it('defines header height', () => {
    expect(root).toMatch(/--header-height:/)
  })

  it('defines z-index scale', () => {
    expect(root).toMatch(/--z-header:/)
  })

  it('defines transition shorthand', () => {
    expect(root).toMatch(/--transition:\s*\d/)
  })
})

describe('CSS Reset (reset.css)', () => {
  let css

  beforeAll(() => {
    css = readCSS('reset.css')
  })

  it('resets box-sizing to border-box on universal selector', () => {
    expect(css).toMatch(/\*/)
    expect(css).toMatch(/box-sizing:\s*border-box/)
  })

  it('resets margins and paddings', () => {
    expect(css).toMatch(/margin:\s*0/)
    expect(css).toMatch(/padding:\s*0/)
  })

  it('sets images to max-width 100%', () => {
    expect(css).toMatch(/max-width:\s*100%/)
  })

  it('guards smooth scroll behind prefers-reduced-motion', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*no-preference/)
    expect(css).toMatch(/scroll-behavior:\s*smooth/)
  })

  it('defines focus-visible outline styles', () => {
    expect(css).toMatch(/:focus-visible/)
    expect(css).toMatch(/outline:/)
  })
})

describe('CSS Typography (typography.css)', () => {
  let css

  beforeAll(() => {
    css = readCSS('typography.css')
  })

  it('applies body font family via variable', () => {
    expect(css).toMatch(/font-family:\s*var\(--font-body\)/)
  })

  it('applies heading font family via variable', () => {
    expect(css).toMatch(/font-family:\s*var\(--font-heading\)/)
  })
})

describe('CSS Layout (layout.css)', () => {
  let css

  beforeAll(() => {
    css = readCSS('layout.css')
  })

  it('defines a container class with max-width', () => {
    expect(css).toMatch(/\.container/)
    expect(css).toMatch(/max-width:\s*var\(--container-max\)/)
  })

  it('defines a section class with vertical padding', () => {
    expect(css).toMatch(/\.section/)
    expect(css).toMatch(/padding-block:/)
  })

  it('defines a grid utility', () => {
    expect(css).toMatch(/\.grid/)
    expect(css).toMatch(/display:\s*grid/)
  })

  it('defines section--below-header modifier', () => {
    expect(css).toMatch(/\.section--below-header/)
    expect(css).toMatch(/margin-top:\s*var\(--header-height\)/)
  })
})
