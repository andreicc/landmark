// POST /api/inquiry — the single endpoint behind all three enquiry forms
// (homepage register-interest, Landmark 4 residence enquiry, contact page).
//
// Same-origin by design: a third-party form service would mean widening the
// site's `connect-src 'self'` CSP and parking buyer data in someone else's
// dashboard. Leads go straight to the sales inbox with Reply-To set to the
// sender, so an advisor can answer by hitting reply.
//
// Responses use the project's envelope: { ok, data, error }.

import { validateLead } from '../lib/lead-validate.js'
import { subjectFor, textFor, htmlFor } from '../lib/lead-email.js'
import { sendEmail, ResendError } from '../lib/resend.js'
import { takeToken } from '../lib/rate-limit.js'

const DEFAULTS = Object.freeze({
  to: 'ioana@landmark.com.ro',
  cc: 'office@landmark.com.ro,andrei.costescu@jeco.dev',
  from: 'Landmark Website <leads@send.landmark.com.ro>',
})

// Visitor-facing copy. The endpoint answers in the language of the page that
// posted to it; the forms render `error` verbatim.
const MESSAGES = Object.freeze({
  en: {
    invalid: 'Please check the highlighted fields and try again.',
    consent: 'Please accept the privacy policy so we can reply.',
    rate: 'That is a few more messages than we can take at once. Please try again shortly.',
    server: 'We could not send your message. Please email ioana@landmark.com.ro directly.',
    method: 'Method not allowed.',
    unsupported: 'Unsupported content type.',
  },
  ro: {
    invalid: 'Vă rugăm să verificați câmpurile marcate și să încercați din nou.',
    consent: 'Vă rugăm să acceptați politica de confidențialitate pentru a vă putea răspunde.',
    rate: 'Am primit prea multe mesaje deodată. Vă rugăm să încercați din nou în scurt timp.',
    server: 'Nu am putut trimite mesajul. Vă rugăm să scrieți direct la ioana@landmark.com.ro.',
    method: 'Metodă nepermisă.',
    unsupported: 'Tip de conținut nepermis.',
  },
})

const copy = (locale) => MESSAGES[locale === 'ro' ? 'ro' : 'en']

const splitList = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

// Vercel sits behind a proxy, so the socket address is the proxy's. The
// left-most x-forwarded-for entry is the client as the platform saw it, and
// the platform overwrites the header rather than appending to it.
//
// IPv6 is bucketed by /64: an address is handed out per-interface and the low
// 64 bits rotate for free, so throttling a full /128 throttles nobody.
function rateLimitKey(req) {
  const forwarded = req.headers['x-forwarded-for']
  const address =
    typeof forwarded === 'string' && forwarded.length
      ? forwarded.split(',')[0].trim()
      : req.socket?.remoteAddress || 'unknown'
  if (!address.includes(':')) return address
  return address.split(':').slice(0, 4).join(':') + '::/64'
}

// Vercel parses JSON bodies for us, but a raw string arrives when the platform
// declines to — handle both. Anything that is not an object becomes {} so the
// validator reports missing fields instead of the handler throwing on `null`.
function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

const isJson = (req) => String(req.headers['content-type'] || '').includes('application/json')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, data: null, error: copy('en').method })
  }

  // Requiring JSON forces a CORS preflight on cross-origin callers, which
  // fails. Without it, a third-party page could make a visitor's browser post
  // leads with text/plain — no preflight needed — and burn their quota.
  if (!isJson(req)) {
    return res.status(415).json({ ok: false, data: null, error: copy('en').unsupported })
  }

  const body = parseBody(req)
  const locale = body.locale === 'ro' ? 'ro' : 'en'
  const t = copy(locale)

  const { ok, discard, errors, lead } = validateLead(body)

  // Bots learn nothing from a success response, so a honeypot hit looks
  // identical to a delivered message from the outside.
  if (discard) return res.status(200).json({ ok: true, data: { received: true }, error: null })

  if (!ok) {
    const onlyConsent = errors.length === 1 && errors[0] === 'consent'
    return res.status(400).json({
      ok: false,
      data: { fields: errors },
      error: onlyConsent ? t.consent : t.invalid,
    })
  }

  const { allowed, retryAfterSeconds } = takeToken(rateLimitKey(req))
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds))
    return res.status(429).json({ ok: false, data: null, error: t.rate })
  }

  try {
    await sendEmail({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.LEAD_FROM || DEFAULTS.from,
      to: splitList(process.env.LEAD_TO || DEFAULTS.to),
      // `??` not `||`: an explicitly empty LEAD_CC means "copy nobody", which
      // is a legitimate thing to want. `to` and `from` keep `||`, because an
      // empty value there would just stop the lead reaching anyone.
      cc: splitList(process.env.LEAD_CC ?? DEFAULTS.cc),
      replyTo: lead.email,
      subject: subjectFor(lead),
      text: textFor(lead),
      html: htmlFor(lead),
    })
    return res.status(200).json({ ok: true, data: { received: true }, error: null })
  } catch (err) {
    // Log the detail for us; return something a visitor can act on. The
    // fallback address matters — a silent failure loses the lead entirely.
    console.error('inquiry: send failed', {
      status: err instanceof ResendError ? err.status : 0,
      message: err.message,
      source: lead.source,
    })
    return res.status(502).json({ ok: false, data: null, error: t.server })
  }
}
