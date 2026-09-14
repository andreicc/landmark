// One-shot image pipeline for the site's large photography.
//
// Four jobs:
//   gallery  — the Landmark 4 renders in source-images/landmark-4/
//              (3840×2160 JPEGs, 3–13MB each) → public/renders/landmark-4/
//   plans    — the 23 apartment plates in source-images/plans/
//              (3032×2312 sales sheets) → public/plans/
//   founders — co-founder portraits in source-images/founders/
//              (square sources, cover-cropped to the card's 4:5) → public/founders/
//   heroes   — the full-bleed page heroes in source-images/
//              (3840×2160 JPEGs) → public/renders/hero/
//
// Each job writes <name>-{width}.webp for its widths plus one <name>-{w}.jpg
// fallback. Targets ~78 quality WebP — typically 90%+ smaller than the source.
//
// Originals are build inputs, NOT deploy artifacts, so they live under
// source-images/ rather than public/ — Vite copies public/ into dist/
// verbatim, so an original parked there ships to every visitor's CDN edge
// while being referenced by nothing. Run this script whenever a source image
// changes, then commit the generated files under public/.
//
// Usage:
//   node scripts/optimize-renders.mjs            # every job
//   node scripts/optimize-renders.mjs heroes     # one job by name
//
// A job whose sources are missing is skipped with a warning rather than
// aborting the run, so one job can still be regenerated if another job's
// originals aren't checked out.

import sharp from 'sharp'
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const WEBP_QUALITY = 78
const JPG_QUALITY = 82

const JOBS = [
  {
    name: 'gallery',
    srcDir: 'source-images/landmark-4',
    outDir: 'public/renders/landmark-4',
    // Gallery renders sit in a grid — the widest slot is ~700px CSS, so 1920
    // already covers a 2× display.
    widths: [800, 1280, 1920],
    fallbackWidth: 1280,
    manifest: true,
  },
  {
    name: 'plans',
    srcDir: 'source-images/plans',
    outDir: 'public/plans',
    // Apartment plates render at most ~800 CSS px inside the 7/12 column, so
    // 1920 already covers a 2x display.
    widths: [800, 1280, 1920],
    fallbackWidth: 1280,
    manifest: false,
    // The delivered sheets carry a Romanian spec panel down the right ~22%.
    // The page renders those figures itself, in the visitor's language, so
    // keep only the drawing (plus its floor-plate key) and trim the surrounding
    // white so every plate fills the frame consistently.
    cropWidthFraction: 0.775,
    trim: true,
  },
  {
    name: 'founders',
    srcDir: 'source-images/founders',
    outDir: 'public/founders',
    // Portrait cards render at 260px CSS in a 4:5 frame, so 800 covers 3x.
    widths: [320, 520, 800],
    fallbackWidth: 520,
    manifest: false,
    // Sources are square; crop to the card's 4:5 frame anchored at the top so
    // the head never gets cut.
    aspect: [4, 5],
    position: 'top',
  },
  {
    name: 'heroes',
    srcFiles: ['source-images/hero.jpg', 'source-images/hero-tower.jpg'],
    outDir: 'public/renders/hero',
    // Heroes are full-bleed (sizes="100vw"), so they need a rung above the
    // gallery's: a 1440px-wide 2× display asks for ~2880 CSS px of image.
    widths: [800, 1280, 1920, 2560],
    // Fallback has to hold up full-bleed too — 1280 visibly softens on
    // desktop, so the non-WebP path gets 1920.
    fallbackWidth: 1920,
    manifest: false,
  },
]

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

// Resolve a job's sources to absolute paths, whether it scans a directory or
// names files explicitly. Returns [] when nothing is present.
async function resolveSources(job) {
  if (job.srcFiles) {
    return job.srcFiles.map((f) => resolve(REPO_ROOT, f)).filter((p) => existsSync(p))
  }
  const dir = resolve(REPO_ROOT, job.srcDir)
  if (!existsSync(dir)) return []
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()
  return files.map((f) => resolve(dir, f))
}

async function runJob(job) {
  const sources = await resolveSources(job)
  if (sources.length === 0) {
    const where = job.srcFiles ? job.srcFiles.join(', ') : job.srcDir
    console.warn(`- ${job.name}: no sources at ${where} — skipped`)
    return { job: job.name, processed: 0 }
  }

  const outDir = resolve(REPO_ROOT, job.outDir)
  await mkdir(outDir, { recursive: true })
  console.log(`\n${job.name} → ${job.outDir}`)

  // Pre-process a source once (crop, then trim) and hand back a buffer every
  // output can resize from.
  //
  // Crop and trim have to run as two pipelines: within a single sharp pipeline
  // the operations are applied in sharp's own fixed order, not call order, so
  // trim runs first and the extract window can then overflow the trimmed image
  // ("extract_area: bad extract area").
  const preprocess = async (src) => {
    let buf = src
    if (job.cropWidthFraction) {
      const meta = await sharp(src).metadata()
      buf = await sharp(src)
        .rotate()
        .extract({
          left: 0,
          top: 0,
          width: Math.round(meta.width * job.cropWidthFraction),
          height: meta.height,
        })
        .toBuffer()
    }
    if (job.trim) buf = await sharp(buf).trim({ threshold: 12 }).toBuffer()
    return buf
  }

  // Width-only by default; jobs with a fixed `aspect` get a cover-crop so every
  // portrait lands in the same frame.
  const sizeFor = (w) =>
    job.aspect
      ? { width: w, height: Math.round((w * job.aspect[1]) / job.aspect[0]),
          fit: 'cover', position: job.position || 'centre', withoutEnlargement: true }
      : { width: w, withoutEnlargement: true }

  const manifest = []
  for (const src of sources) {
    const file = basename(src)
    const stem = slugify(basename(file, extname(file)))
    const srcSize = await fileSize(src)
    const entry = { source: file, slug: stem, sizes: {} }
    const prepared = await preprocess(src)

    for (const w of job.widths) {
      const webp = resolve(outDir, `${stem}-${w}.webp`)
      await sharp(prepared)
        .rotate()
        .resize(sizeFor(w))
        .webp({ quality: WEBP_QUALITY })
        .toFile(webp)
      entry.sizes[`${w}.webp`] = await fileSize(webp)
    }

    const fallback = resolve(outDir, `${stem}-${job.fallbackWidth}.jpg`)
    await sharp(prepared)
      .rotate()
      .resize(sizeFor(job.fallbackWidth))
      .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
      .toFile(fallback)
    entry.sizes[`${job.fallbackWidth}.jpg`] = await fileSize(fallback)

    const total = Object.values(entry.sizes).reduce((a, b) => a + b, 0)
    entry.bytes = { source: srcSize, generated: total }
    manifest.push(entry)
    console.log(
      `✓ ${file} (${(srcSize / 1024 / 1024).toFixed(1)} MB) → ${job.widths.length}× webp + 1× jpg, total ${(total / 1024).toFixed(0)} KB`,
    )
  }

  if (job.manifest) {
    const manifestPath = resolve(outDir, 'manifest.json')
    await writeFile(
      manifestPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest }, null, 2),
    )
    console.log(`  wrote manifest: ${job.outDir}/manifest.json`)
  }

  return { job: job.name, processed: manifest.length }
}

async function main() {
  const only = process.argv.slice(2)
  const jobs = only.length ? JOBS.filter((j) => only.includes(j.name)) : JOBS

  if (jobs.length === 0) {
    console.error(`No matching job. Available: ${JOBS.map((j) => j.name).join(', ')}`)
    process.exit(1)
  }

  const results = []
  for (const job of jobs) {
    results.push(await runJob(job))
  }

  const processed = results.reduce((a, r) => a + r.processed, 0)
  if (processed === 0) {
    console.error('\nNo sources found for any selected job — nothing written.')
    process.exit(1)
  }
  console.log(`\n${processed} image${processed === 1 ? '' : 's'} processed.`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
