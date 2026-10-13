// Minimal Resend client over fetch.
//
// Deliberately not the `resend` npm package: this is one POST to one endpoint,
// and a static marketing site should not grow a dependency (plus its transitive
// tree) to send a single email.

const ENDPOINT = 'https://api.resend.com/emails'
const TIMEOUT_MS = 10_000

export class ResendError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ResendError'
    this.status = status
  }
}

export async function sendEmail({ apiKey, from, to, cc, replyTo, subject, text, html }) {
  if (!apiKey) throw new ResendError('RESEND_API_KEY is not configured', 0)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        ...(cc && cc.length ? { cc } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        text,
        html,
      }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new ResendError(payload.message || `Resend returned ${response.status}`, response.status)
    }
    return { id: payload.id }
  } catch (err) {
    if (err instanceof ResendError) throw err
    if (err.name === 'AbortError') throw new ResendError('Resend timed out', 504)
    throw new ResendError(err.message, 0)
  } finally {
    clearTimeout(timer)
  }
}
