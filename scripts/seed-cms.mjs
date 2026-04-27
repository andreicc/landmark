// One-shot seed: push categories + authors + posts from data/media-fixtures.json
// into the live CMS via Payload's REST API.
//
// Idempotent: skips a record if a matching one already exists (by slug). Posts
// are created in draft state, then patched to published via the _status field.
//
// Usage:
//   CMS_API_URL=https://landmark-cms-delta.vercel.app/api \
//   CMS_EMAIL=you@example.com \
//   CMS_PASSWORD=... \
//   node scripts/seed-cms.mjs

import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const API = (process.env.CMS_API_URL || '').replace(/\/+$/, '')
const EMAIL = process.env.CMS_EMAIL || ''
const PASSWORD = process.env.CMS_PASSWORD || ''

if (!API || !EMAIL || !PASSWORD) {
  console.error('Missing env. Required: CMS_API_URL, CMS_EMAIL, CMS_PASSWORD')
  process.exit(1)
}

let token = ''

async function login() {
  const res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  token = data.token
  if (!token) throw new Error('No token in login response')
  console.log(`✓ Logged in as ${data.user?.email}`)
}

function authHeaders(extra = {}) {
  return { Authorization: `JWT ${token}`, 'Content-Type': 'application/json', ...extra }
}

async function findBySlug(collection, slug, locale = 'en') {
  const url = `${API}/${collection}?where[slug][equals]=${encodeURIComponent(slug)}&locale=${locale}&limit=1`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) return null
  const data = await res.json()
  return data.docs?.[0] || null
}

async function createDoc(collection, payload, locale = 'en') {
  const url = `${API}/${collection}?locale=${locale}`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`POST /${collection} failed: ${res.status} ${body.slice(0, 400)}`)
  }
  return res.json()
}

async function patchDoc(collection, id, payload, locale = 'en') {
  const url = `${API}/${collection}/${id}?locale=${locale}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PATCH /${collection}/${id} failed: ${res.status} ${body.slice(0, 400)}`)
  }
  return res.json()
}

async function ensureCategory(cat) {
  const existing = await findBySlug('categories', cat.slug)
  const enPayload = {
    slug: cat.slug,
    name: typeof cat.name === 'object' ? cat.name.en : cat.name,
    description: typeof cat.description === 'object' ? cat.description.en : cat.description,
  }
  let doc
  if (existing) {
    const patched = await patchDoc('categories', existing.id, enPayload, 'en')
    doc = patched.doc || patched
    console.log(`  ~ category ${cat.slug} updated (id=${existing.id})`)
  } else {
    const created = await createDoc('categories', enPayload)
    doc = created.doc || created
    console.log(`  + category ${cat.slug} created (id=${doc.id})`)
  }
  if (typeof cat.name === 'object' && cat.name.ro) {
    await patchDoc('categories', doc.id, { name: cat.name.ro, description: cat.description?.ro }, 'ro')
  }
  return doc
}

async function ensureAuthor(author) {
  const existing = await findBySlug('authors', author.slug)
  const enPayload = {
    slug: author.slug,
    name: author.name,
    role: author.role,
    bio: typeof author.bio === 'object' ? author.bio.en : author.bio,
  }
  let doc
  if (existing) {
    const patched = await patchDoc('authors', existing.id, enPayload, 'en')
    doc = patched.doc || patched
    console.log(`  ~ author ${author.slug} updated (id=${existing.id})`)
  } else {
    const created = await createDoc('authors', enPayload)
    doc = created.doc || created
    console.log(`  + author ${author.slug} created (id=${doc.id})`)
  }
  if (typeof author.bio === 'object' && author.bio.ro) {
    await patchDoc('authors', doc.id, { bio: author.bio.ro }, 'ro')
  }
  return doc
}

// Wrap a plain HTML/string body in a minimal Lexical AST so Payload accepts it.
function htmlToLexical(html) {
  const text = String(html || '').replace(/<[^>]+>/g, '').trim() || ' '
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }],
          direction: 'ltr',
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
    },
  }
}

async function ensurePost({ post, categoryId, authorId }) {
  const existing = await findBySlug('posts', post.slug)
  // EN payload. heroImage intentionally omitted — fixtures reference paths
  // that don't map to real Media records, and we don't want to clobber a
  // hero an editor manually attached. Updating doesn't touch heroImage.
  const enPayload = {
    slug: post.slug,
    title: post.title.en,
    excerpt: post.excerpt.en,
    body: htmlToLexical(post.body.en),
    category: categoryId,
    author: authorId,
    publishedAt: post.publishedAt,
    tag: post.tag,
    _status: 'published',
  }
  let doc
  if (existing) {
    const patched = await patchDoc('posts', existing.id, enPayload, 'en')
    doc = patched.doc || patched
    console.log(`  ~ post ${post.slug} updated (id=${existing.id})`)
  } else {
    const created = await createDoc('posts', enPayload)
    doc = created.doc || created
    console.log(`  + post ${post.slug} created (id=${doc.id})`)
  }
  // Patch RO locale fields.
  if (post.title.ro) {
    await patchDoc(
      'posts',
      doc.id,
      {
        title: post.title.ro,
        excerpt: post.excerpt.ro,
        body: htmlToLexical(post.body.ro),
      },
      'ro',
    )
  }
  return doc
}

async function main() {
  await login()
  const fixturesPath = resolve(REPO_ROOT, 'data/media-fixtures.json')
  const data = JSON.parse(await readFile(fixturesPath, 'utf-8'))

  console.log('\nCategories:')
  const catBySlug = new Map()
  for (const cat of data.categories || []) {
    const doc = await ensureCategory(cat)
    catBySlug.set(cat.slug, doc.id)
  }

  console.log('\nAuthors:')
  const authorBySlug = new Map()
  for (const a of data.authors || []) {
    const doc = await ensureAuthor(a)
    authorBySlug.set(a.slug, doc.id)
  }

  console.log('\nPosts:')
  let created = 0
  for (const post of data.posts || []) {
    if (post.status !== 'published') {
      console.log(`  - skip draft ${post.slug}`)
      continue
    }
    const categoryId = catBySlug.get(post.category.slug)
    const authorId = authorBySlug.get(post.author.slug)
    if (!categoryId || !authorId) {
      console.log(`  ! skip ${post.slug} — missing category or author`)
      continue
    }
    await ensurePost({ post, categoryId, authorId })
    created++
  }

  console.log(`\nDone. ${created} post(s) processed.`)
}

main().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
