import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { Posts } from './src/collections/Posts'
import { Authors } from './src/collections/Authors'
import { Categories } from './src/collections/Categories'
import { Media } from './src/collections/Media'
import { Users } from './src/collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Build a pg pool config from the DATABASE_URL with explicit SSL options.
// Passing `connectionString` lets pg-connection-string set ssl based on
// `sslmode=require`, which we don't want — we need to control verification.
function parseDbUrl(rawUrl: string) {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set')
  }
  const url = new URL(rawUrl)
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname.replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
  }
}

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — Landmark CMS',
    },
  },
  collections: [Posts, Authors, Categories, Media, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Supabase Postgres. Use the connection-pooler URL (port 6543, transaction
  // mode) for serverless workloads on Vercel — direct connections will exhaust
  // the database under cold-start spikes.
  //
  // pg v9 treats `sslmode=require` as `verify-full` and Supabase's Supavisor
  // pooler ships a chain that isn't in Node's default trust store, so the
  // verify-full check fails with "self-signed certificate in certificate
  // chain". When `connectionString` is passed, the SSL options it parses
  // override anything in the pool config — so we have to break the URL apart
  // and pass discrete fields. TLS is still on; only the chain isn't validated,
  // which is the posture libpq has used for `sslmode=require` for years.
  db: postgresAdapter({
    pool: parseDbUrl(process.env.DATABASE_URL || ''),
    // Use migration files (cms/src/migrations/) — generated locally with
    // `payload migrate:create` and applied via `payload migrate`. Build
    // pipeline runs migrate before next build (see package.json prebuild).
  }),
  // CORS + CSRF must include the CMS's own origin so the admin UI can
  // POST/PUT/DELETE to its own /api/* routes. Vercel exposes both the
  // per-deploy URL (VERCEL_URL) and the canonical production URL
  // (VERCEL_PROJECT_PRODUCTION_URL) — list both because the admin loads
  // on the canonical URL while VERCEL_URL changes every deploy.
  cors: [
    process.env.SITE_URL || 'http://localhost:5173',
    process.env.SITE_URL_RO || 'http://localhost:5173',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
    process.env.NEXT_PUBLIC_SERVER_URL || '',
  ].filter(Boolean),
  csrf: [
    process.env.SITE_URL || 'http://localhost:5173',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
    process.env.NEXT_PUBLIC_SERVER_URL || '',
  ].filter(Boolean),
  localization: {
    locales: ['en', 'ro'],
    defaultLocale: 'en',
    fallback: true,
  },
  // Vercel Blob for image uploads. Always register the plugin so Payload's
  // import map / component registry has the upload handler available; the
  // token is read at runtime when an actual upload happens.
  plugins: [
    vercelBlobStorage({
      enabled: true,
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
})
