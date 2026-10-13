// Renders a validated lead into the notification Ioana receives.
// Pure: no I/O, no mutation — handy to snapshot in tests.

import { SOURCES, INTERESTS, REASONS, CHANNELS, TIMES, LANGUAGES } from './lead-fields.js'

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Rows the advisor reads, in the order they matter on a callback. Blank values
// are dropped rather than printed as "—" so the email stays short.
function rowsFor(lead) {
  const fullName = `${lead.firstName} ${lead.lastName}`.trim()
  const candidates = [
    ['Name', fullName],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Enquiry', REASONS[lead.reason]],
    ['Interested in', INTERESTS[lead.interest]],
    ['Reach me by', CHANNELS[lead.channel]],
    ['Best time', TIMES[lead.bestTime]],
    ['Prefers', LANGUAGES[lead.language]],
    ['Submitted from', SOURCES[lead.source]],
    ['Page language', lead.locale === 'ro' ? 'Romanian site' : 'English site'],
  ]
  return candidates.filter(([, v]) => v)
}

export function subjectFor(lead) {
  const who = `${lead.firstName} ${lead.lastName}`.trim()
  const what = INTERESTS[lead.interest] || REASONS[lead.reason] || SOURCES[lead.source]
  return `Website enquiry · ${what} · ${who}`
}

export function textFor(lead) {
  const rows = rowsFor(lead)
  const width = Math.max(...rows.map(([k]) => k.length))
  const body = rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join('\n')
  const parts = [body]
  if (lead.message) parts.push(`\nMessage\n${'-'.repeat(7)}\n${lead.message}`)
  if (lead.suspiciouslyFast) {
    parts.push(`\n(Submitted ${(lead.elapsedMs / 1000).toFixed(1)}s after the page loaded — unusually fast, possibly automated.)`)
  }
  parts.push('\nReply directly to this email to reach the sender.')
  return parts.join('\n')
}

export function htmlFor(lead) {
  const rows = rowsFor(lead)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b6b6b;font:400 13px/1.6 -apple-system,Segoe UI,sans-serif;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0;color:#111;font:400 14px/1.6 -apple-system,Segoe UI,sans-serif">${escapeHtml(v)}</td></tr>`,
    )
    .join('')

  const message = lead.message
    ? `<p style="margin:24px 0 0;padding:16px 18px;background:#f7f6f3;border-left:2px solid #b59458;color:#111;font:400 14px/1.75 -apple-system,Segoe UI,sans-serif;white-space:pre-wrap">${escapeHtml(lead.message)}</p>`
    : ''

  const warning = lead.suspiciouslyFast
    ? `<p style="margin:20px 0 0;color:#9a6b00;font:400 12px/1.6 -apple-system,Segoe UI,sans-serif">Submitted ${(lead.elapsedMs / 1000).toFixed(1)}s after the page loaded — unusually fast, possibly automated.</p>`
    : ''

  return `<div style="max-width:560px;margin:0 auto;padding:28px 24px">
<p style="margin:0 0 20px;color:#b59458;font:600 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.14em;text-transform:uppercase">New website enquiry</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table>
${message}${warning}
<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e8e6e1;color:#8a8a8a;font:400 12px/1.6 -apple-system,Segoe UI,sans-serif">Reply directly to this email to reach the sender.</p>
</div>`
}
