# Landmark CMS

Payload v3 (Next.js) admin app for the `/media` blog feed. Deploys to Vercel as a separate project from the static marketing site. Database lives on Supabase (Postgres), media on Vercel Blob.

```
cms/
├── package.json
├── payload.config.ts          # central config: collections, locales, db, blob
├── next.config.mjs
├── tsconfig.json
├── .env.example               # copy to .env.local; generate PAYLOAD_SECRET
└── src/
    ├── access/
    │   └── authenticated.ts   # access control: editor-only writes, public reads
    ├── collections/
    │   ├── Posts.ts           # title, slug, excerpt, body, hero, category, author, tag, status, seo
    │   ├── Authors.ts
    │   ├── Categories.ts
    │   ├── Media.ts           # uploads with thumb/card/hero/og sizes
    │   └── Users.ts           # Payload auth users (the editor account)
    └── app/(payload)/
        ├── admin/[[...segments]]/page.tsx   # /admin UI
        ├── api/[...slug]/route.ts           # REST endpoints
        └── importMap.js
```

## Localization

`localization: { locales: ['en','ro'], defaultLocale: 'en', fallback: true }` — fields
marked `localized: true` (title, excerpt, body, category.name, etc.) get a per-locale
value. The build-time fetch in the static site (Phase 4) pulls each locale separately.

## Public read, editor write

Posts default to `read: authenticatedOrPublishedPost` so the build pipeline (and any
public reader with an API token) sees only `status=published`. Drafts are visible
only to authenticated editors.

## Local dev (after Phase 3 install + Phase 3 deploy)

```bash
cd cms
cp .env.example .env.local
# fill PAYLOAD_SECRET, DATABASE_URL (Supabase pooler), BLOB_READ_WRITE_TOKEN
npm install      # ~500MB of deps including Next.js + React + Payload
npm run dev      # admin at http://localhost:3000/admin
```

First boot prompts you to create the admin user (the single editor).

## Deploy

See `DEPLOY.md` for the full Vercel walk-through.
