import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

export default defineConfig({
  appType: 'mpa',
  plugins: [cleanUrls()],
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
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
