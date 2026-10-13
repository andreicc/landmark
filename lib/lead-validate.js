// Validation for an enquiry payload. Pure: takes the raw body, returns a new
// result object and never touches its input.
//
// Two distinct rejection kinds:
//   errors   — the visitor must fix something; the form shows a message.
//   discard  — the submission is a bot; answer 200 and drop it silently, so
//              the bot learns nothing about why it failed.

import {
  SOURCES, INTERESTS, REASONS, CHANNELS, TIMES, LANGUAGES, LOCALES, LIMITS,
} from './lead-fields.js'

// Deliberately permissive. Email validity is ultimately decided by whether the
// address accepts mail, not by a regex; this only catches obvious typos while
// refusing anything that could break a header (whitespace, newlines, commas).
const EMAIL = /^[^\s@,;<>()[\]\\]+@[^\s@,;<>()[\]\\.]+(\.[^\s@,;<>()[\]\\.]+)+$/

// Submitting faster than this is a bot tell, but autofill plus a short form can
// be genuinely quick — so it annotates the lead rather than dropping it. Losing
// a real buyer costs far more than one spam email.
const FAST_SUBMIT_MS = 1500

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Map a slug onto its label, or '' when absent/unrecognised. Unknown slugs are
// dropped rather than rejected so a future form option cannot 500 the endpoint.
const pick = (table, v) => (typeof v === 'string' && table[v] ? v : '')

export function validateLead(body) {
  const raw = body && typeof body === 'object' ? body : {}

  // Honeypot: a field hidden from humans and from assistive tech. Any value
  // means a script filled every input it found.
  if (str(raw.company, 200) !== '') {
    return { ok: false, discard: true, errors: [], lead: null }
  }

  const firstName = str(raw.firstName, LIMITS.name)
  const lastName = str(raw.lastName, LIMITS.name)
  const email = str(raw.email, LIMITS.email)

  const errors = []
  if (!firstName) errors.push('firstName')
  if (!lastName) errors.push('lastName')
  if (!email || !EMAIL.test(email)) errors.push('email')
  if (raw.consent !== true) errors.push('consent')

  if (errors.length) return { ok: false, discard: false, errors, lead: null }

  const elapsedMs = Number.isFinite(raw.elapsedMs) ? Math.max(0, raw.elapsedMs) : null

  return {
    ok: true,
    discard: false,
    errors: [],
    lead: {
      firstName,
      lastName,
      email,
      phone: str(raw.phone, LIMITS.phone),
      message: str(raw.message, LIMITS.message),
      locale: LOCALES.includes(raw.locale) ? raw.locale : 'en',
      source: pick(SOURCES, raw.source) || 'contact',
      interest: pick(INTERESTS, raw.interest),
      reason: pick(REASONS, raw.reason),
      channel: pick(CHANNELS, raw.channel),
      bestTime: pick(TIMES, raw.bestTime),
      language: pick(LANGUAGES, raw.language),
      elapsedMs,
      suspiciouslyFast: elapsedMs !== null && elapsedMs < FAST_SUBMIT_MS,
    },
  }
}

export { FAST_SUBMIT_MS }
