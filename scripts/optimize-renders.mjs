// One-shot image pipeline for the Landmark 4 renders.
// Reads originals from assets/2. randari-landmark-4/ (3840×2160 JPEGs, 4–13MB
// each) and writes a responsive set into public/renders/landmark-4/:
//   <name>-{800,1280,1920}.webp  + <name>-1280.jpg fallback
// Targets ~80 quality WebP — typically 90%+ smaller than the source.

import sharp from 'sharp'
import { readdir, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const SRC_DIR = resolve(REPO_ROOT, 'assets/2. randari-landmark-4')
const OUT_DIR = resolve(REPO_ROOT, 'public/renders/landmark-4')

const WIDTHS = [800, 1280, 1920]
const WEBP_QUALITY = 78
const JPG_QUALITY = 82

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fileSize(path) {
  try {
    const s = await stat(path)
    return s.size
  } catch {
    return 0
  }
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`Source not found: ${SRC_DIR}`)
    process.exit(1)
  }
  await mkdir(OUT_DIR, { recursive: true })

  const files = (await readdir(SRC_DIR))
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort()

  const manifest = []
  for (const file of files) {
    const src = resolve(SRC_DIR, file)
    const stem = slugify(basename(file, extname(file)))
    const srcSize = await fileSize(src)

    const entry = { source: file, slug: stem, sizes: {} }

    for (const w of WIDTHS) {
      const webp = resolve(OUT_DIR, `${stem}-${w}.webp`)
      await sharp(src)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webp)
      entry.sizes[`${w}.webp`] = await fileSize(webp)
    }

    const fallback = resolve(OUT_DIR, `${stem}-1280.jpg`)
    await sharp(src)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
      .toFile(fallback)
    entry.sizes['1280.jpg'] = await fileSize(fallback)

    const total = Object.values(entry.sizes).reduce((a, b) => a + b, 0)
    entry.bytes = { source: srcSize, generated: total }
    manifest.push(entry)
    console.log(
      `✓ ${file} (${(srcSize / 1024 / 1024).toFixed(1)} MB) → ${WIDTHS.length}× webp + 1× jpg, total ${(total / 1024).toFixed(0)} KB`,
    )
  }

  const manifestPath = resolve(OUT_DIR, 'manifest.json')
  await import('node:fs/promises').then((fs) =>
    fs.writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest }, null, 2)),
  )
  console.log(`\nWrote manifest: ${manifestPath}`)
  console.log(`${files.length} images processed.`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
