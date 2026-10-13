import { describe, it, expect } from 'vitest'
import { subjectFor, textFor, htmlFor } from '../lib/lead-email.js'

const lead = {
  firstName: 'Ana',
  lastName: 'Popescu',
  email: 'ana@example.ro',
  phone: '+40 722 111 222',
  message: 'Drawn to floor 9.',
  locale: 'ro',
  source: 'projects',
  interest: 'apt-3',
  reason: '',
  channel: 'whatsapp',
  bestTime: 'morning',
  language: 'ro',
  elapsedMs: 42_000,
  suspiciouslyFast: false,
}

describe('subjectFor', () => {
  it('leads with what they want and who they are', () => {
    expect(subjectFor(lead)).toBe('Website enquiry · Apartment · 3 rooms · Ana Popescu')
  })

  it('falls back to the enquiry reason when no residence was picked', () => {
    const subject = subjectFor({ ...lead, interest: '', reason: 'press' })
    expect(subject).toBe('Website enquiry · Press & media · Ana Popescu')
  })

  it('falls back to the form itself when neither was picked', () => {
    const subject = subjectFor({ ...lead, interest: '', reason: '', source: 'homepage' })
    expect(subject).toContain('Homepage — register interest')
  })
})

describe('textFor', () => {
  const body = textFor(lead)

  it('renders the English label, not the posted slug', () => {
    expect(body).toContain('Apartment · 3 rooms')
    expect(body).not.toContain('apt-3')
  })

  it('reports which site the visitor was reading', () => {
    expect(body).toContain('Romanian site')
  })

  it('includes the message under its own heading', () => {
    expect(body).toContain('Drawn to floor 9.')
  })

  it('tells the reader they can just hit reply', () => {
    expect(body).toMatch(/Reply directly/i)
  })

  it('omits rows the visitor left blank rather than printing placeholders', () => {
    const sparse = textFor({ ...lead, phone: '', channel: '', bestTime: '', language: '' })
    expect(sparse).not.toContain('Phone')
    expect(sparse).not.toContain('Best time')
    expect(sparse).toContain('ana@example.ro')
  })

  it('notes an implausibly fast submit so the reader can judge it', () => {
    const flagged = textFor({ ...lead, elapsedMs: 400, suspiciouslyFast: true })
    expect(flagged).toMatch(/0\.4s after the page loaded/)
    expect(flagged).toMatch(/possibly automated/)
  })
})

describe('htmlFor', () => {
  it('escapes visitor input so a lead cannot inject markup into the inbox', () => {
    const html = htmlFor({ ...lead, firstName: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes the free-text message too', () => {
    const html = htmlFor({ ...lead, message: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
  })

  it('escapes quotes, which would otherwise break out of an attribute', () => {
    expect(htmlFor({ ...lead, lastName: '"\'' })).toContain('&quot;&#39;')
  })

  it('drops the message block entirely when there is no message', () => {
    expect(htmlFor({ ...lead, message: '' })).not.toContain('border-left')
  })
})
