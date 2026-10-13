import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import handler from '../api/inquiry.js'
import { resetRateLimit } from '../lib/rate-limit.js'

// A stand-in for Vercel's req/res pair, narrow enough to stay readable.
function mockReq({ method = 'POST', body = {}, ip = '198.51.100.7', contentType = 'application/json' } = {}) {
  const headers = { 'x-forwarded-for': ip }
  if (contentType !== null) headers['content-type'] = contentType
  return { method, body, headers, socket: {} }
}

function mockRes() {
  const res = { statusCode: null, body: null, headers: {} }
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (payload) => { res.body = payload; return res }
  res.setHeader = (key, value) => { res.headers[key] = value }
  return res
}

async function call(options) {
  const res = mockRes()
  await handler(mockReq(options), res)
  return res
}

const valid = {
  firstName: 'Ana',
  lastName: 'Popescu',
  email: 'ana@example.ro',
  consent: true,
  interest: 'apt-3',
  source: 'projects',
  elapsedMs: 20_000,
}

// Each test gets a fresh IP so the shared rate-limit counter cannot leak
// between cases, plus an explicit reset for the ones that assert on it.
let ipCounter = 0
const freshIp = () => `203.0.113.${(ipCounter += 1)}`

describe('POST /api/inquiry', () => {
  let fetchMock

  beforeEach(() => {
    resetRateLimit()
    process.env.RESEND_API_KEY = 'test-key'
    delete process.env.LEAD_TO
    delete process.env.LEAD_CC
    delete process.env.LEAD_FROM
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'email_123' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('refuses anything but POST', async () => {
    const res = await call({ method: 'GET', ip: freshIp() })
    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('POST')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the lead and confirms receipt', async () => {
    const res = await call({ body: valid, ip: freshIp() })
    expect(res.statusCode).toBe(200)
    // The provider's message id is of no use to a visitor, so it stays internal.
    expect(res.body).toEqual({ ok: true, data: { received: true }, error: null })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('accepts only JSON, so a cross-origin simple request cannot reach it', async () => {
    // text/plain needs no CORS preflight, so without this a third-party page
    // could make a visitor's browser post leads and burn their quota.
    for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', null]) {
      const res = await call({ body: valid, ip: freshIp(), contentType })
      expect(res.statusCode, `content-type ${contentType}`).toBe(415)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('tolerates a null JSON body instead of throwing', async () => {
    const res = await call({ body: 'null', ip: freshIp() })
    expect(res.statusCode).toBe(400)
  })

  it('addresses the sales inbox and copies the office and the owner', async () => {
    await call({ body: valid, ip: freshIp() })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.to).toEqual(['ioana@landmark.com.ro'])
    expect(sent.cc).toEqual(['office@landmark.com.ro', 'andrei.costescu@jeco.dev'])
  })

  it('sets Reply-To to the visitor so an advisor can just hit reply', async () => {
    await call({ body: valid, ip: freshIp() })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.reply_to).toBe('ana@example.ro')
  })

  it('authenticates with the configured key and never puts it in the body', async () => {
    await call({ body: valid, ip: freshIp() })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer test-key')
    expect(init.body).not.toContain('test-key')
  })

  it('lets the environment override recipients without a code change', async () => {
    process.env.LEAD_TO = 'sales@example.ro'
    process.env.LEAD_CC = 'one@example.ro, two@example.ro'
    process.env.LEAD_FROM = 'Test <t@example.ro>'
    await call({ body: valid, ip: freshIp() })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.to).toEqual(['sales@example.ro'])
    expect(sent.cc).toEqual(['one@example.ro', 'two@example.ro'])
    expect(sent.from).toBe('Test <t@example.ro>')
  })

  it('rejects an incomplete submission and names the fields', async () => {
    const res = await call({ body: { firstName: 'Ana' }, ip: freshIp() })
    expect(res.statusCode).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.data.fields).toEqual(['lastName', 'email', 'consent'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('answers missing consent with its own sentence', async () => {
    const res = await call({ body: { ...valid, consent: false }, ip: freshIp() })
    expect(res.body.error).toMatch(/accept the privacy policy/i)
  })

  it('answers in Romanian when the Romanian page posted', async () => {
    const res = await call({ body: { ...valid, consent: false, locale: 'ro' }, ip: freshIp() })
    expect(res.body.error).toContain('politica de confidențialitate')
  })

  it('accepts and silently drops a honeypot hit, telling the bot nothing', async () => {
    const res = await call({ body: { ...valid, company: 'Acme' }, ip: freshIp() })
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('parses a JSON string body, as arrives when the content-type is odd', async () => {
    const res = await call({ body: JSON.stringify(valid), ip: freshIp() })
    expect(res.statusCode).toBe(200)
  })

  it('survives an unparseable body', async () => {
    const res = await call({ body: 'not json at all', ip: freshIp() })
    expect(res.statusCode).toBe(400)
  })

  it('rejects slugs inherited from Object.prototype', async () => {
    // A bare table[key] lookup would let `__proto__` or `toString` through and
    // land "[object Object]" in the subject line.
    await call({ body: { ...valid, source: '__proto__', interest: 'toString' }, ip: freshIp() })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.subject).not.toMatch(/object Object|native code/)
  })

  it('throttles a flood from one address', async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i += 1) {
      expect((await call({ body: valid, ip })).statusCode).toBe(200)
    }
    const blocked = await call({ body: valid, ip })
    expect(blocked.statusCode).toBe(429)
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('does not spend quota on submissions that never get sent', async () => {
    // Five typos, or a few people behind one office NAT, should not lock the
    // form for ten minutes. The scarce resource is the outbound email.
    const ip = freshIp()
    for (let i = 0; i < 8; i += 1) {
      expect((await call({ body: { firstName: 'Ana' }, ip })).statusCode).toBe(400)
    }
    expect((await call({ body: valid, ip })).statusCode).toBe(200)
  })

  it('does not spend quota on honeypot hits', async () => {
    const ip = freshIp()
    for (let i = 0; i < 8; i += 1) {
      await call({ body: { ...valid, company: 'Acme' }, ip })
    }
    expect((await call({ body: valid, ip })).statusCode).toBe(200)
  })

  it('buckets IPv6 callers by /64, which is what gets handed to one subscriber', async () => {
    // The low 64 bits rotate for free, so a per-/128 bucket throttles nobody.
    const base = '2001:db8:1234:5678'
    for (let i = 0; i < 5; i += 1) {
      expect((await call({ body: valid, ip: `${base}::${i + 1}` })).statusCode).toBe(200)
    }
    const sameSubnet = await call({ body: valid, ip: `${base}:ffff:ffff:ffff:ffff` })
    expect(sameSubnet.statusCode).toBe(429)
    // A different /64 is a different subscriber.
    const elsewhere = await call({ body: valid, ip: '2001:db8:1234:9999::1' })
    expect(elsewhere.statusCode).toBe(200)
  })

  it('treats an empty LEAD_CC as "copy nobody", not as "use the default"', async () => {
    process.env.LEAD_CC = ''
    await call({ body: valid, ip: freshIp() })
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.cc).toBeUndefined()
  })

  describe('when the provider fails', () => {
    it('returns 502 and points the visitor at a working address', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: 'domain is not verified' }),
      })
      const res = await call({ body: valid, ip: freshIp() })
      expect(res.statusCode).toBe(502)
      expect(res.body.error).toContain('ioana@landmark.com.ro')
    })

    it('does not leak the provider error to the visitor', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'API key is invalid' }),
      })
      const res = await call({ body: valid, ip: freshIp() })
      expect(JSON.stringify(res.body)).not.toMatch(/API key/i)
    })

    it('survives a network-level failure', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'))
      const res = await call({ body: valid, ip: freshIp() })
      expect(res.statusCode).toBe(502)
    })

    it('fails cleanly when the key was never configured', async () => {
      delete process.env.RESEND_API_KEY
      const res = await call({ body: valid, ip: freshIp() })
      expect(res.statusCode).toBe(502)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
