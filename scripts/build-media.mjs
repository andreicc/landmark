// Build-time script: fetch published Posts from Payload (CMS), validate the
// shape, and emit per-slug HTML files for the static site to serve.
//
// Run as part of `npm run build` (see package.json prebuild). Writes:
//   media/<slug>.html        — EN article
//   ro/media/<slug>.html     — RO article (only when RO content present)
//   data/media-manifest.json — slug list + flags (consumed by vite.config.js
//                              to register the slug pages as build inputs)
//
// On fetch failure, falls back to data/media-fixtures.json so that:
//   1. Local dev works without CMS reachable
//   2. CI builds during a CMS outage still succeed (with a banner flag in the
//      manifest so a human can spot it)

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePost } from './posts-schema.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const LOCALES = ['en', 'ro']

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Render Payload's Lexical body to bare HTML. Keeps a small subset of nodes —
// paragraph, heading, list, quote, link, bold/italic. Future blocks (figure,
// embed) can be added here without touching the rest of the pipeline.
export function renderLexical(node) {
  if (!node) return ''
  if (Array.isArray(node)) return node.map(renderLexical).join('')
  if (node.type === 'root') return renderLexical(node.children)
  if (node.type === 'paragraph') return `<p>${renderLexical(node.children)}</p>`
  if (node.type === 'heading') {
    const level = Math.max(2, Math.min(4, Number(node.tag?.replace('h', '')) || 2))
    return `<h${level}>${renderLexical(node.children)}</h${level}>`
  }
  if (node.type === 'quote') return `<blockquote>${renderLexical(node.children)}</blockquote>`
  if (node.type === 'list') {
    const tag = node.listType === 'number' ? 'ol' : 'ul'
    return `<${tag}>${renderLexical(node.children)}</${tag}>`
  }
  if (node.type === 'listitem') return `<li>${renderLexical(node.children)}</li>`
  if (node.type === 'link') {
    const url = node.fields?.url || node.url || '#'
    return `<a href="${escapeHtml(url)}">${renderLexical(node.children)}</a>`
  }
  if (node.type === 'text') {
    let html = escapeHtml(node.text)
    if (node.format & 1) html = `<strong>${html}</strong>`
    if (node.format & 2) html = `<em>${html}</em>`
    return html
  }
  return node.children ? renderLexical(node.children) : ''
}

// Convert a body that may be a Lexical AST OR a plain HTML string into HTML.
function bodyToHtml(body) {
  if (!body) return ''
  if (typeof body === 'string') return body
  if (body.root) return renderLexical(body.root)
  return renderLexical(body)
}

function pickLocalized(value, locale, fallback = 'en') {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[locale] ?? value[fallback] ?? ''
  }
  return String(value)
}

// Take the EN and RO docs returned for the same slug and produce the shape our
// schema validator expects: localized fields are objects { en, ro }.
export function normalizePayloadPost(en, ro) {
  if (!en) throw new Error('EN post is required')
  const out = {
    id: String(en.id),
    slug: en.slug,
    title: { en: pickLocalized(en.title, 'en') },
    excerpt: { en: pickLocalized(en.excerpt, 'en') },
    heroImage: {
      url: en.heroImage?.url ?? '',
      alt: { en: pickLocalized(en.heroImage?.alt ?? en.heroImage?.alt?.en, 'en') },
    },
    body: { en: bodyToHtml(en.body) },
    category: en.category
      ? {
          slug: en.category.slug,
          name: { en: pickLocalized(en.category.name, 'en') },
        }
      : { slug: 'journal', name: { en: 'Journal' } },
    author: en.author
      ? { slug: en.author.slug, name: en.author.name }
      : { slug: 'site-team', name: 'Site Team' },
    publishedAt: en.publishedAt ?? new Date().toISOString(),
    status: 'published',
    tag: en.tag,
  }
  if (ro) {
    out.title.ro = pickLocalized(ro.title, 'ro')
    out.excerpt.ro = pickLocalized(ro.excerpt, 'ro')
    if (ro.heroImage?.alt) out.heroImage.alt.ro = pickLocalized(ro.heroImage.alt, 'ro')
    out.body.ro = bodyToHtml(ro.body)
    if (ro.category?.name) out.category.name.ro = pickLocalized(ro.category.name, 'ro')
  }
  return out
}

function fmtDate(iso, locale) {
  try {
    return new Date(iso).toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// Render an article HTML page. Kept simple and self-contained — uses the same
// Tailwind CDN + Lato/Roboto + brand tokens as the rest of the site.
export function renderArticle({ post, locale, hasOtherLocale, siteUrl = '' }) {
  const isRo = locale === 'ro'
  const title = pickLocalized(post.title, locale)
  const excerpt = pickLocalized(post.excerpt, locale)
  const body = pickLocalized(post.body, locale) || ''
  const heroAlt = pickLocalized(post.heroImage.alt ?? {}, locale)
  const heroUrl = post.heroImage.url
  const categoryName = pickLocalized(post.category.name, locale)
  const slug = post.slug
  const otherLocale = isRo ? 'en' : 'ro'
  const otherPath = isRo ? `/media/${slug}` : `/ro/media/${slug}`
  const selfPath = isRo ? `/ro/media/${slug}` : `/media/${slug}`
  const langAttr = isRo ? 'ro' : 'en'
  const enPath = `/media/${slug}`
  const roPath = `/ro/media/${slug}`
  const navLabels = isRo
    ? { about: 'Despre noi', communities: 'Comunități', properties: 'Proprietăți', media: 'Media', careers: 'Cariere', contact: 'Contact', back: 'Înapoi la jurnal', skip: 'Sari la conținut' }
    : { about: 'About', communities: 'Communities', properties: 'Properties', media: 'Media', careers: 'Careers', contact: 'Contact', back: 'Back to the journal', skip: 'Skip to main content' }
  const aboutHref = isRo ? '/ro/about' : '/about'
  const projectsHref = isRo ? '/ro/projects' : '/projects'
  const contactHref = isRo ? '/ro/contact' : '/contact'
  const mediaHref = isRo ? '/ro/media' : '/media'
  const homeHref = isRo ? '/ro/' : '/'

  return `<!DOCTYPE html>
<html class="light" lang="${langAttr}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — Landmark Realty</title>
<meta name="description" content="${escapeHtml(excerpt)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" hreflang="en" href="${enPath}">
${hasOtherLocale ? `<link rel="alternate" hreflang="ro" href="${roPath}">` : ''}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(excerpt)}">
${heroUrl ? `<meta property="og:image" content="${escapeHtml(heroUrl)}">` : ''}
<meta property="og:type" content="article">
<meta property="og:locale" content="${isRo ? 'ro_RO' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description: excerpt,
  image: heroUrl ? [heroUrl] : undefined,
  datePublished: post.publishedAt,
  author: { '@type': 'Person', name: post.author.name },
  publisher: { '@type': 'Organization', name: 'Landmark Realty' },
})}
</script>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<script>
tailwind.config = { darkMode: "class", theme: { extend: {
  colors: { "primary":"#004225","landmark-green":"#004225","landmark-gold":"#b59458","stone-bg":"#f9f8f6" },
  fontFamily: { headline:["Lato","sans-serif"], body:["Roboto","sans-serif"] },
}}}
</script>
<style>
:root { --accent:#b59458; --primary:#004225; --bg:#fcfcfc; --ink:#1b1c1c; }
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--ink); font-family: 'Roboto', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
.font-headline { font-family: 'Lato', sans-serif; font-weight: 300; }
.eyebrow { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; font-weight: 600; }
.label { font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500; }
.serif-italic { font-family: 'Lato', sans-serif; font-style: italic; font-weight: 300; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 250, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
.nav-link { position: relative; }
.nav-link::after { content:''; position:absolute; left:0; bottom:-4px; height:1px; width:0; background: currentColor; transition: width .35s cubic-bezier(.16,1,.3,1); }
.nav-link:hover::after { width: 100%; }
.article-body { max-width: 720px; }
.article-body p { font-size: 18px; line-height: 1.85; margin-bottom: 1.5em; color: rgba(0,0,0,0.78); }
.article-body h2 { font-family:'Lato',sans-serif; font-weight: 300; font-size: 32px; line-height: 1.25; margin-top: 2em; margin-bottom: .8em; color: #111; letter-spacing: -0.01em; }
.article-body h3 { font-family:'Lato',sans-serif; font-weight: 400; font-size: 22px; margin-top: 1.6em; margin-bottom: .6em; color: #111; }
.article-body blockquote { border-left: 2px solid var(--accent); padding-left: 24px; margin: 2em 0; font-style: italic; color: rgba(0,0,0,0.7); font-size: 20px; line-height: 1.6; }
.article-body a { color: var(--primary); text-decoration: underline; text-underline-offset: 4px; }
.article-body img { width:100%; height:auto; margin: 2em 0; }
.skip-link { position: absolute; top: 0; left: 0; padding: .75rem 1.5rem; background: var(--primary); color:#fff; font-weight:600; z-index: 9999; transform: translateY(-100%); transition: transform .2s; }
.skip-link:focus { transform: translateY(0); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
</style>
</head>
<body class="selection:bg-primary/10">
<a class="skip-link" href="#main-content">${navLabels.skip}</a>

<header>
<nav class="fixed top-0 w-full z-50 bg-white/96 border-b border-black/5" aria-label="Main">
  <div class="flex justify-between items-center px-6 lg:px-12 h-[72px] w-full max-w-[1920px] mx-auto">
    <div class="hidden lg:flex gap-9 items-center font-medium tracking-[0.14em] text-[12px] uppercase text-black/85">
      <a class="nav-link" href="${aboutHref}">${navLabels.about}</a>
      <a class="nav-link" href="#">${navLabels.communities}</a>
      <a class="nav-link" href="${projectsHref}">${navLabels.properties}</a>
    </div>
    <a href="${homeHref}" class="absolute left-1/2 -translate-x-1/2 flex items-center no-underline">
      <span class="font-headline text-[20px] tracking-[0.3em] text-landmark-green">LANDMARK</span>
    </a>
    <div class="flex items-center gap-6">
      <div class="hidden lg:flex gap-6 items-center font-medium tracking-[0.14em] text-[12px] uppercase text-black/85">
        <a class="nav-link" href="${mediaHref}">${navLabels.media}</a>
        <a class="nav-link" href="#">${navLabels.careers}</a>
        <a class="nav-link" href="${contactHref}">${navLabels.contact}</a>
      </div>
      <div class="lang-switcher flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] pl-4 border-l border-black/15" data-lang-switcher>
        <a href="${enPath}" class="no-underline ${isRo ? 'opacity-60 hover:opacity-100' : ''}" hreflang="en"${isRo ? '' : ' aria-current="page"'}>EN</a>
        <span class="opacity-40">/</span>
        <a href="${roPath}" class="no-underline ${isRo ? '' : 'opacity-60 hover:opacity-100'}" hreflang="ro"${isRo ? ' aria-current="page"' : ''}>RO</a>
      </div>
    </div>
  </div>
</nav>
</header>

<main id="main-content" class="pt-[72px]">

<article class="bg-white">
  <div class="max-w-[1380px] mx-auto px-6 lg:px-10 pt-16 pb-10">
    <a href="${mediaHref}" class="inline-flex items-center gap-2 label text-landmark-green hover:text-landmark-gold transition">
      <span class="material-symbols-outlined text-[18px]">arrow_back</span>
      ${navLabels.back}
    </a>
  </div>
  <header class="max-w-[920px] mx-auto px-6 lg:px-10 pb-12">
    <div class="flex items-center gap-4 mb-6">
      <span class="eyebrow text-landmark-gold">${escapeHtml(categoryName)}</span>
      <span class="w-8 h-px bg-black/30"></span>
      <time class="label text-black/55" datetime="${escapeHtml(post.publishedAt)}">${fmtDate(post.publishedAt, locale)}</time>
    </div>
    <h1 class="font-headline text-black" style="font-size: clamp(36px, 5.6vw, 72px); line-height: 1.05; letter-spacing: -0.015em; font-weight: 300;">
      ${escapeHtml(title)}
    </h1>
    ${excerpt ? `<p class="mt-8 text-[20px] leading-[1.6] text-black/65 font-light max-w-[720px]">${escapeHtml(excerpt)}</p>` : ''}
    <div class="mt-10 label text-black/55">${escapeHtml(post.author.name)}</div>
  </header>
  ${heroUrl ? `<div class="max-w-[1380px] mx-auto px-6 lg:px-10 mb-16">
    <img src="${escapeHtml(heroUrl)}" alt="${escapeHtml(heroAlt)}" class="w-full h-auto" loading="eager">
  </div>` : ''}
  <div class="max-w-[920px] mx-auto px-6 lg:px-10 pb-24">
    <div class="article-body">
      ${body}
    </div>
  </div>
</article>

</main>

<footer class="bg-[#0e1512] text-white py-20">
  <div class="max-w-[1380px] mx-auto px-6 lg:px-10 text-center">
    <a href="${homeHref}" class="font-headline tracking-[0.3em] text-[16px] no-underline">LANDMARK</a>
    <p class="mt-4 label text-white/40">EST · MMVIII · BUCHAREST</p>
  </div>
</footer>

</body>
</html>
`
}

// Render the /media index page (EN or RO) listing all published posts as
// cards, with the filter pill row from the design and an empty state when
// there are no posts.
export function renderMediaIndex({ posts, locale }) {
  const isRo = locale === 'ro'
  const langAttr = isRo ? 'ro' : 'en'
  const labels = isRo
    ? {
        about: 'Despre noi', communities: 'Comunități', properties: 'Proprietăți',
        media: 'Media', careers: 'Cariere', contact: 'Contact', skip: 'Sari la conținut',
        eyebrow: 'DIRECT DE PE ȘANTIER',
        heroLine1: 'Jurnal', heroAccent: 'de', heroLine2: 'teren.',
        heroLead: 'O cronică continuă de pe șantierele noastre active — turnări de beton și sosiri de piatră, cadre time-lapse și note discrete de meșteșug.',
        filter: 'Filtru', all: 'Toate', read: 'Citește articolul',
        empty: 'Nu există încă articole. Reveniți curând.',
      }
    : {
        about: 'About', communities: 'Communities', properties: 'Properties',
        media: 'Media', careers: 'Careers', contact: 'Contact', skip: 'Skip to main content',
        eyebrow: 'LIVE FROM SITE',
        heroLine1: 'The', heroAccent: 'field', heroLine2: 'journal.',
        heroLead: 'A continuous dispatch from our active building sites — concrete pours and stone arrivals, time-lapse stills and quiet craft notes.',
        filter: 'Filter', all: 'All', read: 'Read article',
        empty: 'No posts yet. Check back soon.',
      }
  const aboutHref = isRo ? '/ro/about' : '/about'
  const projectsHref = isRo ? '/ro/projects' : '/projects'
  const contactHref = isRo ? '/ro/contact' : '/contact'
  const mediaHref = isRo ? '/ro/media' : '/media'
  const homeHref = isRo ? '/ro/' : '/'
  const enPath = '/media'
  const roPath = '/ro/media'

  const tags = new Set()
  for (const p of posts) if (p.tag) tags.add(p.tag)

  const cardHtml = posts
    .map((p) => {
      const articleHref = isRo ? `/ro/media/${p.slug}` : `/media/${p.slug}`
      const t = pickLocalized(p.title, locale)
      const e = pickLocalized(p.excerpt, locale)
      const cat = pickLocalized(p.category.name, locale)
      const date = fmtDate(p.publishedAt, locale)
      const heroAlt = pickLocalized(p.heroImage?.alt ?? {}, locale)
      const heroUrl = p.heroImage?.url
      return `<article class="post group" data-post data-tag="${escapeHtml(p.tag || '')}" data-date="${escapeHtml(p.publishedAt || '')}">
  <a href="${articleHref}" class="block no-underline">
    ${heroUrl ? `<div class="aspect-[4/3] overflow-hidden bg-stone-bg mb-6">
      <img src="${escapeHtml(heroUrl)}" alt="${escapeHtml(heroAlt)}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" loading="lazy">
    </div>` : ''}
    <div class="flex items-center gap-3 mb-4">
      <span class="eyebrow text-landmark-gold">${escapeHtml(cat)}</span>
      <span class="w-6 h-px bg-black/30"></span>
      <time class="label text-black/55" datetime="${escapeHtml(p.publishedAt || '')}">${date}</time>
    </div>
    <h3 class="font-headline text-black leading-tight mb-3" style="font-size: 24px; font-weight: 300;">${escapeHtml(t)}</h3>
    <p class="text-[14px] leading-[1.7] text-black/65 mb-5">${escapeHtml(e)}</p>
    <span class="inline-flex items-center gap-2 label text-landmark-green group-hover:text-landmark-gold transition">
      ${labels.read}
      <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
    </span>
  </a>
</article>`
    })
    .join('\n')

  const filterPills = [
    `<button class="chip is-active" data-filter="all">${labels.all}</button>`,
    ...Array.from(tags).map((t) => `<button class="chip" data-filter="${escapeHtml(t)}">${escapeHtml(String(t).replace(/^./, (c) => c.toUpperCase()))}</button>`),
  ].join('\n')

  const emptyState = `<div class="text-center py-24"><p class="text-[18px] text-black/55 font-light">${labels.empty}</p></div>`

  return `<!DOCTYPE html>
<html class="light" lang="${langAttr}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${isRo ? 'Media — Un jurnal de teren · Landmark Realty' : 'Media — A field journal · Landmark Realty'}</title>
<meta name="description" content="${escapeHtml(labels.heroLead)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" hreflang="en" href="${enPath}">
<link rel="alternate" hreflang="ro" href="${roPath}">
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<script>
tailwind.config = { darkMode: "class", theme: { extend: {
  colors: { "primary":"#004225","landmark-green":"#004225","landmark-gold":"#b59458","stone-bg":"#f9f8f6" },
  fontFamily: { headline:["Lato","sans-serif"], body:["Roboto","sans-serif"] },
}}}
</script>
<style>
:root { --accent:#b59458; --primary:#004225; --bg:#fcfcfc; --ink:#1b1c1c; }
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--ink); font-family: 'Roboto', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
.font-headline { font-family: 'Lato', sans-serif; font-weight: 300; }
.eyebrow { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; font-weight: 600; }
.label { font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500; }
.micro { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; font-weight: 600; }
.serif-italic { font-family: 'Lato', sans-serif; font-style: italic; font-weight: 300; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 250, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
.nav-link { position: relative; }
.nav-link::after { content:''; position:absolute; left:0; bottom:-4px; height:1px; width:0; background: currentColor; transition: width .35s cubic-bezier(.16,1,.3,1); }
.nav-link:hover::after { width: 100%; }
.skip-link { position: absolute; top: 0; left: 0; padding: .75rem 1.5rem; background: var(--primary); color:#fff; font-weight:600; z-index: 9999; transform: translateY(-100%); transition: transform .2s; }
.skip-link:focus { transform: translateY(0); }
.chip { display:inline-flex; align-items:center; gap:6px; padding: 7px 13px; border:1px solid rgba(255,255,255,0.2); border-radius:999px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; font-weight:600; color:rgba(255,255,255,0.7); background:transparent; cursor:pointer; transition: all .2s; }
.chip:hover { color: #fff; border-color: rgba(255,255,255,0.6); }
.chip.is-active { background: var(--accent); color: #111; border-color: var(--accent); }
.hero-canvas { background: radial-gradient(120% 80% at 80% 20%, rgba(181,148,88,.18), transparent 60%), radial-gradient(120% 80% at 10% 80%, rgba(0,66,37,.32), transparent 55%), linear-gradient(180deg, #0c1410 0%, #0a1310 60%, #050a08 100%); }
.post { transition: transform .5s cubic-bezier(.16,1,.3,1); }
.post:hover { transform: translateY(-6px); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
</style>
</head>
<body class="selection:bg-primary/10">
<a class="skip-link" href="#main-content">${labels.skip}</a>

<header>
<nav class="fixed top-0 w-full z-50 text-white" aria-label="Main">
  <div class="flex justify-between items-center px-6 lg:px-12 h-[72px] w-full max-w-[1920px] mx-auto">
    <div class="hidden lg:flex gap-9 items-center font-medium tracking-[0.14em] text-[12px] uppercase">
      <a class="nav-link" href="${aboutHref}">${labels.about}</a>
      <a class="nav-link" href="#">${labels.communities}</a>
      <a class="nav-link" href="${projectsHref}">${labels.properties}</a>
    </div>
    <a href="${homeHref}" class="absolute left-1/2 -translate-x-1/2 flex items-center no-underline">
      <span class="font-headline tracking-[0.3em] text-[20px]">LANDMARK</span>
    </a>
    <div class="flex items-center gap-6">
      <div class="hidden lg:flex gap-6 items-center font-medium tracking-[0.14em] text-[12px] uppercase">
        <a class="nav-link" href="${mediaHref}" aria-current="page">${labels.media}</a>
        <a class="nav-link" href="#">${labels.careers}</a>
        <a class="nav-link" href="${contactHref}">${labels.contact}</a>
      </div>
      <div class="lang-switcher flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] pl-4 border-l border-white/20" data-lang-switcher>
        <a href="${enPath}" class="no-underline ${isRo ? 'opacity-60 hover:opacity-100' : ''}" hreflang="en"${isRo ? '' : ' aria-current="page"'}>EN</a>
        <span class="opacity-40">/</span>
        <a href="${roPath}" class="no-underline ${isRo ? '' : 'opacity-60 hover:opacity-100'}" hreflang="ro"${isRo ? ' aria-current="page"' : ''}>RO</a>
      </div>
    </div>
  </div>
</nav>
</header>

<main id="main-content">

<section class="hero-canvas relative pt-32 pb-20 text-white">
  <div class="max-w-[1380px] mx-auto px-6 lg:px-10">
    <div class="flex items-center gap-4 mb-8">
      <span class="micro text-white/80">${labels.eyebrow}</span>
      <span class="w-8 h-px bg-white/30"></span>
      <span class="micro text-white/55">${posts.length} ${isRo ? 'articole' : 'posts'}</span>
    </div>
    <h1 class="font-headline" style="font-size: clamp(48px, 7vw, 104px); line-height: 0.98; letter-spacing: -0.02em;">
      ${labels.heroLine1} <span class="serif-italic text-landmark-gold">${labels.heroAccent}</span><br>${labels.heroLine2}
    </h1>
    <p class="mt-8 max-w-2xl text-white/75 text-[18px] leading-[1.75] font-light">${escapeHtml(labels.heroLead)}</p>
    <div class="mt-10 flex flex-wrap gap-3 items-center">
      <span class="micro text-white/55 mr-2">${labels.filter}</span>
      ${filterPills}
    </div>
  </div>
</section>

<section class="bg-white py-20">
  <div class="max-w-[1380px] mx-auto px-6 lg:px-10">
    ${posts.length === 0 ? emptyState : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">${cardHtml}</div>`}
  </div>
</section>

</main>

<footer class="bg-[#0e1512] text-white py-20">
  <div class="max-w-[1380px] mx-auto px-6 lg:px-10 text-center">
    <a href="${homeHref}" class="font-headline tracking-[0.3em] text-[16px] no-underline">LANDMARK</a>
    <p class="mt-4 label text-white/40">EST · MMVIII · BUCHAREST</p>
  </div>
</footer>

<script>
(function(){
  const chips = document.querySelectorAll('.chip[data-filter]');
  const cards = document.querySelectorAll('[data-post]');
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.remove('is-active'));
    c.classList.add('is-active');
    const f = c.dataset.filter;
    cards.forEach(card => {
      const show = f === 'all' || card.dataset.tag === f;
      card.style.display = show ? '' : 'none';
    });
  }));
})();
</script>

</body>
</html>
`
}

// Default fetcher — hits Payload's REST API. Replaceable in tests.
export function makeFetcher({ apiUrl, token }) {
  return async function fetchLocale(locale) {
    const url = `${apiUrl}/posts?where[_status][equals]=published&depth=2&limit=200&locale=${locale}`
    const headers = {}
    if (token) headers.Authorization = `users API-Key ${token}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      throw new Error(`CMS fetch failed for locale=${locale}: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }
}

async function loadFixtures(fixturesPath) {
  if (!fixturesPath || !existsSync(fixturesPath)) return null
  try {
    const raw = await readFile(fixturesPath, 'utf-8')
    const data = JSON.parse(raw)
    return data
  } catch (err) {
    return null
  }
}

export async function buildMedia({
  fetcher,
  outDir = REPO_ROOT,
  fixturesPath = resolve(REPO_ROOT, 'data/media-fixtures.json'),
  siteUrl = process.env.SITE_URL || '',
  log = console,
} = {}) {
  let posts = []
  let fallback = false

  try {
    const enResp = await fetcher('en')
    const roResp = await fetcher('ro')
    const enDocs = Array.isArray(enResp?.docs) ? enResp.docs : []
    const roDocs = Array.isArray(roResp?.docs) ? roResp.docs : []
    const roBySlug = new Map(roDocs.map((d) => [d.slug, d]))
    posts = enDocs.map((en) => normalizePayloadPost(en, roBySlug.get(en.slug) || null))
  } catch (err) {
    log.warn?.(`[build-media] CMS fetch failed: ${err.message} — falling back to fixtures`)
    fallback = true
    const fixtures = await loadFixtures(fixturesPath)
    if (!fixtures) {
      throw new Error(
        `CMS fetch failed and no usable fixtures at ${fixturesPath}. Set CMS_API_URL+BUILD_FETCH_TOKEN or commit a fallback file.`,
      )
    }
    posts = (fixtures.posts || []).filter((p) => p.status === 'published')
  }

  // Validate every post; fail loud on bad data.
  const validated = []
  for (const post of posts) {
    const result = validatePost(post)
    if (!result.valid) {
      log.warn?.(`[build-media] skipping invalid post slug=${post.slug}: ${result.errors.join('; ')}`)
      continue
    }
    validated.push(post)
  }

  // Emit per-slug HTML.
  await mkdir(join(outDir, 'media'), { recursive: true })
  await mkdir(join(outDir, 'ro', 'media'), { recursive: true })

  for (const post of validated) {
    const hasRo = Boolean(post.title?.ro)
    const enHtml = renderArticle({ post, locale: 'en', hasOtherLocale: hasRo, siteUrl })
    await writeFile(join(outDir, 'media', `${post.slug}.html`), enHtml, 'utf-8')
    if (hasRo) {
      const roHtml = renderArticle({ post, locale: 'ro', hasOtherLocale: true, siteUrl })
      await writeFile(join(outDir, 'ro', 'media', `${post.slug}.html`), roHtml, 'utf-8')
    }
  }

  // Index pages — overwrite the design's static media.html with a
  // generated version listing real CMS posts. Both EN and RO variants.
  await writeFile(
    join(outDir, 'media.html'),
    renderMediaIndex({ posts: validated, locale: 'en' }),
    'utf-8',
  )
  const roPosts = validated.filter((p) => p.title?.ro)
  await writeFile(
    join(outDir, 'ro', 'media.html'),
    renderMediaIndex({ posts: roPosts, locale: 'ro' }),
    'utf-8',
  )

  // Manifest for Vite to pick up the slug pages as build inputs.
  const manifest = {
    generatedAt: new Date().toISOString(),
    fallback,
    slugs: validated.map((p) => p.slug),
    roSlugs: validated.filter((p) => p.title?.ro).map((p) => p.slug),
    count: validated.length,
  }
  await mkdir(join(outDir, 'data'), { recursive: true })
  await writeFile(
    join(outDir, 'data', 'media-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  )

  log.info?.(`[build-media] wrote ${validated.length} EN article${validated.length === 1 ? '' : 's'}, ${manifest.roSlugs.length} RO. fallback=${fallback}`)
  return manifest
}

// CLI entrypoint — only runs when invoked directly via `node scripts/build-media.mjs`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const apiUrl = process.env.CMS_API_URL
  const token = process.env.BUILD_FETCH_TOKEN
  const fetcher = apiUrl
    ? makeFetcher({ apiUrl, token })
    : async () => {
        throw new Error('CMS_API_URL not set')
      }
  buildMedia({ fetcher }).catch((err) => {
    console.error('[build-media] FATAL:', err)
    process.exit(1)
  })
}
