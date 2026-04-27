import { postgresAdapter } from '@payloadcms/db-postgres'
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
  cors: [
    process.env.SITE_URL || 'http://localhost:5173',
    process.env.SITE_URL_RO || 'http://localhost:5173',
  ].filter(Boolean),
  csrf: [
    process.env.SITE_URL || 'http://localhost:5173',
  ].filter(Boolean),
  localization: {
    locales: ['en', 'ro'],
    defaultLocale: 'en',
    fallback: true,
  },
  // Storage plugins removed for now — Payload's default local-disk uploads
  // don't persist on Vercel serverless, but the admin will boot. Re-add
  // Vercel Blob (or S3 / Supabase Storage) once the admin auth + content
  // flow is verified end-to-end.
  plugins: [],
})
