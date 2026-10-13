import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT = readFileSync(resolve(__dirname, '../public/js/lead-form.js'), 'utf-8')

// A minimal page honouring the same contract the real forms do — asserted
// against the shipped markup in lead-forms.test.js. Keeping the harness small
// means a failure here is the client's fault, not the marketing page's.
const HARNESS = `<!DOCTYPE html><html lang="en"><body>
<form id="f" data-lead-form="contact" data-success="ok" data-error="err"
      data-sending="Sending…" data-offline="Offline — email ioana@landmark.com.ro.">
  <input name="firstName" value="Ana">
  <input name="lastName" value="Popescu">
  <input name="email" type="email" value="ana@example.ro">
  <input name="phone" value="+40722000111">
  <select name="interest"><option value="apt-3" selected>Apartment · 3 rooms</option></select>
  <textarea name="message">Floor 9 please</textarea>
  <div class="lead-trap" aria-hidden="true"><input name="company" value=""></div>
  <div data-group="contact">
    <button type="button" class="chip" data-val="email">Email</button>
    <button type="button" class="chip is-on" data-val="whatsapp">WhatsApp</button>
  </div>
  <div data-group="time">
    <button type="button" class="chip is-on" data-val="morning">Morning</button>
  </div>
  <div data-group="lang">
    <button type="button" class="chip is-on" data-val="ro">Română</button>
  </div>
  <input name="consent" type="checkbox" checked>
  <button type="submit">Send</button>
  <div id="err" role="alert" class="hidden"></div>
  <div id="ok" class="hidden">Thank you</div>
</form>
</body></html>`

function mount({ response, reject } = {}) {
  const dom = new JSDOM(HARNESS, { runScripts: 'dangerously' })
  const { window } = dom
  window.Element.prototype.scrollIntoView = () => {}

  const fetchMock = reject
    ? vi.fn().mockRejectedValue(new Error('offline'))
    : vi.fn().mockResolvedValue({
        json: async () => response || { ok: true, data: { received: true }, error: null },
      })
  window.fetch = fetchMock

  const script = window.document.createElement('script')
  script.textContent = CLIENT
  window.document.body.appendChild(script)

  const form = window.document.getElementById('f')
  const submit = async () => {
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    // Let the handler's awaited fetch settle.
    await new Promise((r) => setTimeout(r, 0))
  }
  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)

  return { window, form, fetchMock, submit, sentBody, doc: window.document }
}

describe('lead-form.js — payload', () => {
  let ctx

  beforeEach(async () => {
    ctx = mount()
    await ctx.submit()
  })

  it('posts JSON to the endpoint', () => {
    const [url, init] = ctx.fetchMock.mock.calls[0]
    expect(url).toBe('/api/inquiry')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('carries every named field', () => {
    expect(ctx.sentBody()).toMatchObject({
      firstName: 'Ana',
      lastName: 'Popescu',
      email: 'ana@example.ro',
      phone: '+40722000111',
      interest: 'apt-3',
      message: 'Floor 9 please',
      consent: true,
    })
  })

  it('reads the selected chip out of each group', () => {
    // The chips are styled buttons, not inputs — FormData cannot see them, so
    // the client has to lift their state out of the DOM.
    expect(ctx.sentBody()).toMatchObject({
      channel: 'whatsapp',
      bestTime: 'morning',
      language: 'ro',
    })
  })

  it('tags the form it came from and the page language', () => {
    expect(ctx.sentBody().source).toBe('contact')
    expect(ctx.sentBody().locale).toBe('en')
  })

  it('reports how long the page was open, for the bot-timing check', () => {
    expect(typeof ctx.sentBody().elapsedMs).toBe('number')
    expect(ctx.sentBody().elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('never submits the form the old-fashioned way', () => {
    // A real navigation would lose the chips and the timing signal.
    const event = new ctx.window.Event('submit', { bubbles: true, cancelable: true })
    ctx.form.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})

describe('lead-form.js — success', () => {
  it('reveals the success block and locks the form', async () => {
    const ctx = mount()
    await ctx.submit()
    expect(ctx.doc.getElementById('ok').className).not.toContain('hidden')
    ctx.form.querySelectorAll('input, textarea, select, button').forEach((el) => {
      expect(el.disabled).toBe(true)
    })
  })

  it('leaves the error block hidden', async () => {
    const ctx = mount()
    await ctx.submit()
    expect(ctx.doc.getElementById('err').className).toContain('hidden')
  })
})

describe('lead-form.js — failure', () => {
  it('shows the server sentence and keeps the form usable', async () => {
    const ctx = mount({
      response: { ok: false, data: { fields: ['email'] }, error: 'Please check the email.' },
    })
    await ctx.submit()

    const err = ctx.doc.getElementById('err')
    expect(err.className).not.toContain('hidden')
    expect(err.textContent).toBe('Please check the email.')
    expect(ctx.doc.getElementById('ok').className).toContain('hidden')
    // Critically: the visitor can correct and retry.
    expect(ctx.form.querySelector('button[type=submit]').disabled).toBe(false)
  })

  it('marks the fields the server named', async () => {
    const ctx = mount({
      response: { ok: false, data: { fields: ['email', 'consent'] }, error: 'Check fields.' },
    })
    await ctx.submit()
    expect(ctx.form.querySelector('[name="email"]').getAttribute('aria-invalid')).toBe('true')
    expect(ctx.form.querySelector('[name="consent"]').getAttribute('aria-invalid')).toBe('true')
    expect(ctx.form.querySelector('[name="phone"]').hasAttribute('aria-invalid')).toBe(false)
  })

  it('clears stale field marks on the next attempt', async () => {
    const ctx = mount({
      response: { ok: false, data: { fields: ['email'] }, error: 'Check the email.' },
    })
    await ctx.submit()
    expect(ctx.form.querySelector('[name="email"]').hasAttribute('data-invalid')).toBe(true)

    ctx.fetchMock.mockResolvedValue({
      json: async () => ({ ok: false, data: { fields: ['phone'] }, error: 'Check the phone.' }),
    })
    await ctx.submit()
    expect(ctx.form.querySelector('[name="email"]').hasAttribute('data-invalid')).toBe(false)
    expect(ctx.form.querySelector('[name="phone"]').hasAttribute('data-invalid')).toBe(true)
  })

  it('falls back to its own copy when the request never lands', async () => {
    const ctx = mount({ reject: true })
    await ctx.submit()
    const err = ctx.doc.getElementById('err')
    expect(err.className).not.toContain('hidden')
    expect(err.textContent).toContain('ioana@landmark.com.ro')
    expect(ctx.form.querySelector('button[type=submit]').disabled).toBe(false)
  })

  it('restores the submit label after a failure', async () => {
    const ctx = mount({ response: { ok: false, data: {}, error: 'Nope.' } })
    await ctx.submit()
    expect(ctx.form.querySelector('button[type=submit]').innerHTML).toBe('Send')
  })

  it('renders the server sentence as text, never as markup', async () => {
    const ctx = mount({
      response: { ok: false, data: {}, error: '<img src=x onerror=alert(1)>' },
    })
    await ctx.submit()
    const err = ctx.doc.getElementById('err')
    expect(err.querySelector('img')).toBeNull()
    expect(err.textContent).toContain('<img')
  })
})
