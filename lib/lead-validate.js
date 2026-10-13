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
// refusing anything that could break a header. The excluded set is what would
// let a sender smuggle extra recipients or headers past us: whitespace, commas,
// semicolons, angle brackets, quotes, parens, backslashes and control bytes.
// Both quantified classes exclude `@`, and the label class excludes `.`, so
// there is no ambiguous partition to backtrack over — the match stays linear.
const EMAIL =
  /^[^\s@,;<>()[\]\\"\u0000-\u001f\u007f-\u009f]+@[^\s@,;<>()[\]\\".\u0000-\u001f\u007f-\u009f]+(\.[^\s@,;<>()[\]\\".\u0000-\u001f\u007f-\u009f]+)+$/

// Submitting faster than this is a bot tell, but autofill plus a short form can
// be genuinely quick — so it annotates the lead rather than dropping it. Losing
// a real buyer costs far more than one spam email.
const FAST_SUBMIT_MS = 1500

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Control characters, including the Unicode line separators.
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g

// Fields that are a single line by nature: names, phone, email. A newline
// smuggled into one of these forges an extra row in the plain-text
// notification — `phone: "123\nEmail  ceo@bank.com"` reads as a second
// address — and the subject line is a mail header, where CRLF is worse than
// cosmetic. Collapse every whitespace run to one space.
const oneLine = (v, max) => str(v, max).replace(CONTROL, ' ').replace(/\s+/g, ' ').trim()

// The message is a textarea, so real newlines are meaningful and kept. Every
// other control character is not.
const multiLine = (v, max) =>
  str(v, max)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/g, '')

// Map a slug onto its label, or '' when absent/unrecognised. Unknown slugs are
// dropped rather than rejected so a future form option cannot 500 the endpoint.
const pick = (table, v) => (typeof v === 'string' && Object.hasOwn(table, v) ? v : '')

export function validateLead(body) {
  const raw = body && typeof body === 'object' ? body : {}

  // Honeypot: a field hidden from humans and from assistive tech. Any value
  // means a script filled every input it found.
  if (str(raw.company, 200) !== '') {
    return { ok: false, discard: true, errors: [], lead: null }
  }

  const firstName = oneLine(raw.firstName, LIMITS.name)
  const lastName = oneLine(raw.lastName, LIMITS.name)
  const email = oneLine(raw.email, LIMITS.email)

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
      phone: oneLine(raw.phone, LIMITS.phone),
      message: multiLine(raw.message, LIMITS.message),
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
