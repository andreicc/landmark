import { describe, it, expect } from 'vitest'
import { validateLead, FAST_SUBMIT_MS } from '../lib/lead-validate.js'

const valid = {
  firstName: 'Ana',
  lastName: 'Popescu',
  email: 'ana@example.ro',
  consent: true,
}

describe('validateLead — required fields', () => {
  it('names every missing field rather than failing on the first', () => {
    const { ok, errors } = validateLead({})
    expect(ok).toBe(false)
    expect(errors).toEqual(['firstName', 'lastName', 'email', 'consent'])
  })

  it('accepts a minimal valid payload', () => {
    expect(validateLead(valid).ok).toBe(true)
  })

  it('refuses a submission without consent', () => {
    expect(validateLead({ ...valid, consent: false }).errors).toEqual(['consent'])
    expect(validateLead({ ...valid, consent: 'yes' }).errors).toEqual(['consent'])
  })

  it('treats whitespace-only names as missing', () => {
    const { errors } = validateLead({ ...valid, firstName: '   ', lastName: '\t' })
    expect(errors).toEqual(['firstName', 'lastName'])
  })

  it('tolerates a non-object body instead of throwing', () => {
    expect(validateLead(null).ok).toBe(false)
    expect(validateLead('nope').ok).toBe(false)
    expect(validateLead(42).ok).toBe(false)
  })
})

describe('validateLead — email', () => {
  it.each([
    'ana@example.ro',
    'ana.maria+tag@sub.example.co.uk',
    "o'brien@example.com",
  ])('accepts %s', (email) => {
    expect(validateLead({ ...valid, email }).ok).toBe(true)
  })

  it.each([
    ['no at sign', 'anaexample.ro'],
    ['no tld', 'ana@example'],
    ['trailing dot', 'ana@example.'],
    ['space inside', 'ana @example.ro'],
    // A comma or angle bracket would let a sender smuggle extra recipients
    // into the Reply-To header.
    ['comma injection', 'ana@example.ro, evil@attacker.com'],
    ['angle injection', 'ana@example.ro><evil@attacker.com'],
    ['newline injection', 'ana@example.ro\nBcc: evil@attacker.com'],
  ])('rejects %s', (_label, email) => {
    expect(validateLead({ ...valid, email }).errors).toContain('email')
  })
})

describe('validateLead — bot handling', () => {
  it('discards anything that filled the honeypot', () => {
    const result = validateLead({ ...valid, company: 'Acme Ltd' })
    expect(result.discard).toBe(true)
    expect(result.ok).toBe(false)
    expect(result.lead).toBeNull()
  })

  it('does not discard when the honeypot is empty or absent', () => {
    expect(validateLead({ ...valid, company: '' }).discard).toBe(false)
    expect(validateLead({ ...valid, company: '  ' }).discard).toBe(false)
    expect(validateLead(valid).discard).toBe(false)
  })

  it('flags an implausibly fast submit without rejecting it', () => {
    // Autofill can beat a human, and losing a real buyer costs far more than
    // receiving one spam email — so this annotates rather than blocks.
    const fast = validateLead({ ...valid, elapsedMs: FAST_SUBMIT_MS - 1 })
    expect(fast.ok).toBe(true)
    expect(fast.lead.suspiciouslyFast).toBe(true)

    const human = validateLead({ ...valid, elapsedMs: 30_000 })
    expect(human.lead.suspiciouslyFast).toBe(false)
  })

  it('leaves the flag off when no timing was reported', () => {
    const { lead } = validateLead(valid)
    expect(lead.elapsedMs).toBeNull()
    expect(lead.suspiciouslyFast).toBe(false)
  })
})

describe('validateLead — normalisation', () => {
  it('trims surrounding whitespace', () => {
    const { lead } = validateLead({ ...valid, firstName: '  Ana  ', email: ' ana@example.ro ' })
    expect(lead.firstName).toBe('Ana')
    expect(lead.email).toBe('ana@example.ro')
  })

  it('truncates an over-long message to the documented limit', () => {
    const { lead } = validateLead({ ...valid, message: 'x'.repeat(5000) })
    expect(lead.message).toHaveLength(500)
  })

  it('keeps recognised slugs and silently drops unknown ones', () => {
    const { lead } = validateLead({
      ...valid,
      interest: 'apt-3',
      reason: 'viewing',
      channel: 'not-a-channel',
      bestTime: 'morning',
      language: 'de',
    })
    expect(lead.interest).toBe('apt-3')
    expect(lead.reason).toBe('viewing')
    expect(lead.channel).toBe('')
    expect(lead.bestTime).toBe('morning')
    expect(lead.language).toBe('')
  })

  it('defaults locale to en and source to contact', () => {
    const { lead } = validateLead({ ...valid, locale: 'fr', source: 'elsewhere' })
    expect(lead.locale).toBe('en')
    expect(lead.source).toBe('contact')
  })

  it('honours a supported locale and source', () => {
    const { lead } = validateLead({ ...valid, locale: 'ro', source: 'homepage' })
    expect(lead.locale).toBe('ro')
    expect(lead.source).toBe('homepage')
  })

  it('does not mutate the body it was given', () => {
    const body = { ...valid, firstName: '  Ana  ' }
    const snapshot = JSON.stringify(body)
    validateLead(body)
    expect(JSON.stringify(body)).toBe(snapshot)
  })
})
