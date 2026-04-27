import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Replace the design's hardcoded posts with CMS-driven cards. The build
// pipeline (build-media.mjs) writes data/media-feed-{en,ro}.html with the
// rendered cards; this plugin injects them between the markers in
// media.html and ro/media.html during transformIndexHtml. If the feed
// files don't exist (no CMS reachable, fixtures-only build), the design's
// hardcoded posts stay as fallback.
function injectFeedCards() {
  return {
    name: 'landmark-inject-feed',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const isRo = ctx.path.startsWith('/ro/media') || ctx.filename?.includes('/ro/media.html')
        const isMediaIndex = ctx.path === '/media.html' || ctx.path === '/ro/media.html' ||
          ctx.filename?.endsWith('media.html')
        if (!isMediaIndex) return html
        if (!html.includes('<!-- POSTS_INJECT_START -->')) return html
        const feedFile = resolve(__dirname, isRo ? 'data/media-feed-ro.html' : 'data/media-feed-en.html')
        if (!existsSync(feedFile)) return html
        const feedHtml = readFileSync(feedFile, 'utf-8')
        return html.replace(
          /<!-- POSTS_INJECT_START -->[\s\S]*?<!-- POSTS_INJECT_END -->/,
          `<!-- POSTS_INJECT_START -->\n${feedHtml}\n      <!-- POSTS_INJECT_END -->`,
        )
      },
    },
  }
}

// Read scripts/build-media.mjs's manifest to register per-slug HTML files
// as Vite build inputs. Build pipeline runs build-media before vite build,
// so this file should exist by the time Vite starts.
function mediaInputs() {
  const manifestPath = resolve(__dirname, 'data/media-manifest.json')
  if (!existsSync(manifestPath)) return {}
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    const inputs = {}
    for (const slug of manifest.slugs || []) {
      const file = resolve(__dirname, `media/${slug}.html`)
      if (existsSync(file)) inputs[`media-${slug}`] = file
    }
    for (const slug of manifest.roSlugs || []) {
      const file = resolve(__dirname, `ro/media/${slug}.html`)
      if (existsSync(file)) inputs[`ro-media-${slug}`] = file
    }
    return inputs
  } catch {
    return {}
  }
}

function cleanUrls() {
  return {
    name: 'landmark-clean-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url || '/'
        if (url.endsWith('.html') || url.includes('.')) return next()
        const [pathname, query = ''] = url.split('?')
        const trimmed = pathname.replace(/\/+$/, '')
        const candidates = [
          trimmed ? `${trimmed}.html` : '',
          trimmed ? `${trimmed}/index.html` : '',
        ].filter(Boolean)
        for (const candidate of candidates) {
          const fsPath = resolve(__dirname, '.' + candidate)
          if (existsSync(fsPath)) {
            req.url = candidate + (query ? `?${query}` : '')
            return next()
          }
        }
        return next()
      })
    },
  }
}

// Vite v6 resolves every `<link href>` against the filesystem, regardless of
// `rel`. `<link rel="alternate" href="/">` therefore tries to read the project
// root as a file → EISDIR. Rewrite alternates to absolute URLs before Vite's
// asset scanner sees them. Absolute URLs are the SEO-correct shape for
// hreflang anyway (Google: "fully-specified URLs are recommended").
function hreflangAlternates() {
  const SITE_URL = (process.env.SITE_URL || 'https://landmark.example').replace(/\/+$/, '')
  return {
    name: 'landmark-hreflang-alternates',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(
          /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/?>/g,
          (match, lang, href) => {
            if (href.startsWith('http')) return match
            const path = href.startsWith('/') ? href : `/${href}`
            return `<link rel="alternate" hreflang="${lang}" href="${SITE_URL}${path}">`
          },
        )
      },
    },
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [cleanUrls(), hreflangAlternates(), injectFeedCards()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        projects: resolve(__dirname, 'projects.html'),
        media: resolve(__dirname, 'media.html'),
        roMain: resolve(__dirname, 'ro/index.html'),
        roAbout: resolve(__dirname, 'ro/about.html'),
        roContact: resolve(__dirname, 'ro/contact.html'),
        roProjects: resolve(__dirname, 'ro/projects.html'),
        roMedia: resolve(__dirname, 'ro/media.html'),
        ...mediaInputs(),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
