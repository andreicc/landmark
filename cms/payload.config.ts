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
  // chain". Disable cert chain verification on the pool — TLS is still on,
  // just the chain isn't validated. This is the same posture libpq has used
  // for `sslmode=require` for years.
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
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
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
})
