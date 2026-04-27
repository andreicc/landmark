# Deploy the Landmark CMS

Two deploys: **Supabase** (database) + **Vercel** (the CMS Next.js app + Blob storage).
The static site (root of the repo) and the CMS (this folder) are two separate Vercel
projects, both from the same Git repository.

## 0 · Prerequisites

- A Supabase project (you already created this).
- A Vercel account with the repo connected.
- Node 20.9+ locally if you plan to run the admin in dev.
- ~10 minutes.

## 1 · Get the Supabase connection string

1. Open your Supabase project → **Project Settings** → **Database**.
2. Scroll to **Connection string** → click the **Transaction** tab (the pooler, port 6543).
3. Copy the **URI** value. It looks like:

   ```
   postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```

4. Replace `[YOUR-PASSWORD]` with the DB password you set at project creation.

> **Why the pooler, not the direct connection?** Vercel serverless functions cold-start
> aggressively; each invocation can open a new DB connection. The direct connection
> (`db.<ref>.supabase.co:5432`) caps at ~60 connections and exhausts fast. The pooler
> (port 6543, "transaction" mode) handles thousands. Use it for production. Direct
> connection is fine for local dev or DB migrations only.

## 2 · Provision Vercel Blob

1. Vercel Dashboard → **Storage** → **Create** → **Blob**.
2. Name it `landmark-cms-media`.
3. Copy the `BLOB_READ_WRITE_TOKEN`.

## 3 · Create the CMS Vercel project

1. Vercel Dashboard → **Add New** → **Project** → import this repo.
2. **Project name:** `landmark-cms`.
3. **Root directory:** `cms` (important — not the repo root).
4. **Framework preset:** Next.js (auto-detected).
5. **Public Environment Variables Prefix:** leave blank — none of our env vars
   need to be exposed to the browser.
6. Add **Environment Variables** (all environments):

   | Key | Value |
   |---|---|
   | `PAYLOAD_SECRET` | output of `openssl rand -base64 32` |
   | `DATABASE_URL` | Supabase pooler URI from step 1 |
   | `BLOB_READ_WRITE_TOKEN` | from step 2 |
   | `SITE_URL` | `https://<your-static-site>.vercel.app` |
   | `SITE_URL_RO` | `https://<your-static-site>.vercel.app/ro` |

7. Deploy. The first build runs Payload's auto-migration and creates the schema in
   your Supabase Postgres database. Confirm in Supabase → **Database** → **Tables**
   that `payload_users`, `posts`, `authors`, `categories`, `media`, etc. appeared.

## 4 · Create the editor account

1. Visit `https://landmark-cms.vercel.app/admin`.
2. Payload prompts you to create the first user — that is your single editor account.
3. Save the credentials.

## 5 · Seed initial content

Use `data/media-fixtures.json` (in the repo root) as a content reference. In the admin:

1. **Categories** → create `Press`, `Journal`, `Market`.
2. **Authors** → at least one (e.g. `Andrei Constantinescu`, `Site Team`).
3. **Posts** → create one published post end-to-end to validate the flow.
   Make sure to fill EN and RO locales (toggle at top of the editor).

## 6 · Generate a build-time API token (used in Phase 4)

1. Admin → Users → your account → **API Keys** → **Create**.
2. Scope: read-only on `posts`, `authors`, `categories`, `media`.
3. Copy the token. Add it to the **static site's** Vercel project env as
   `BUILD_FETCH_TOKEN` (NOT in this CMS project).

## 7 · Custom domain (optional)

In the CMS Vercel project → Settings → Domains → add `cms.<your-domain>`.
Update `SITE_URL` env to match if you also map a custom domain to the static site.

## Smoke checks

```bash
# admin UI loads
curl -I https://landmark-cms.vercel.app/admin

# REST API responds (returns published posts)
curl https://landmark-cms.vercel.app/api/posts?limit=1&where[status][equals]=published

# Locale-switching works
curl 'https://landmark-cms.vercel.app/api/posts?limit=1&locale=ro'

# Blob upload works: in admin, upload a test image to Media. Confirm a public URL
# starting with https://<hash>.public.blob.vercel-storage.com/...
```

## Supabase Row-Level Security (RLS)

Payload manages access control at the application layer (see `src/access/`), so RLS
is **not required**. If your Supabase project has RLS enabled by default and Payload
inserts fail, either:
- Disable RLS on the Payload tables (recommended — Payload IS the only writer), or
- Use a service-role connection string (still pooled).

The pooler URL from step 1 uses the `postgres` superuser, which bypasses RLS by default.

## Rollback

If a deploy misbehaves, in the Vercel dashboard for `landmark-cms`:
- Deployments → pick the last green deploy → **Promote to Production**.

The static site does not depend on the CMS at runtime — only at build time. A
broken CMS means future builds fail; previously-deployed static pages stay up.

## When you provide the credentials

Paste them into Vercel's project settings (never commit them). The local `.env.example`
in this folder lists exactly what's needed.
