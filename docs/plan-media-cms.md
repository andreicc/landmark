# Landmark site — Design refresh + /contact + /media + Payload CMS

> Status: APPROVED — decisions locked 2026-04-27
> Author: planner agent (saved 2026-04-27)
> Source request: "(1) HTML design updates for some pages, (2) implement /contact and /media, (3) /media is a blog feed with Payload CMS"

## Decisions LOCKED (2026-04-27)

| # | Decision | Locked answer |
|---|----------|---------------|
| 1 | Architecture | **Two Vercel projects.** Static Vite MPA stays as-is on Vercel (project 1). Payload v3 deploys as a separate Next.js app on Vercel (project 2) at `cms.<domain>`. Build-time fetch from project 1 → project 2's `/api/posts`. Lives under `/cms/` directory in this repo, deployed via separate Vercel project root. |
| 2 | Database | **Supabase Postgres** (revised 2026-04-27 — user provisioned Supabase rather than Vercel Postgres). Connection via Supabase pooler URI on port 6543, transaction mode, suitable for Vercel serverless cold-starts. Adapter: `@payloadcms/db-postgres` (generic), not `db-vercel-postgres`. |
| 3 | Media storage | **Vercel Blob** via `@payloadcms/storage-vercel-blob` adapter. |
| 4 | Payload host | **Vercel** (Next.js project, not Railway). |
| 5 | Auth | **Single editor account.** No role-based access — one admin. |
| 6 | 54 pre-existing failing tests | **Defer** to a separate cleanup PR. |
| 7 | Updated designs | Located in `update_design/Landmark/`. Stale: `Home.html` (82KB → 51KB). New: `Contact.html`, `Media.html`. Unchanged: `About.html`, `Landmark 4.html`. |

## Stale-handoff inventory (Phase 0 scope after decision #7)

- **`Home.html`** — re-port required (significantly changed from prior handoff)
- **`Contact.html`** — Phase 1 (new file, no re-port — fresh implementation)
- **`Media.html`** — Phase 2 (new file)
- **`About.html`** — unchanged, no action
- **`Landmark 4.html`** — unchanged, no action

Per the EN/RO parity rule (`memory/feedback_i18n_parity.md`), every EN change requires the matching RO mirror in the same task — `ro/index.html` will be updated alongside `index.html` in Phase 0.



---

## Goals

**Design parity refresh.** Re-port any updated Stitch handoff files in `/Landmark/*.html` into live root pages (EN) and mirror every change to `/ro/*.html` so the Romanian build stays structurally identical. Re-running `tests/i18n-parity.test.js` (24 tests) must remain green.

**New marketing surfaces.** Replace the legacy `contact.html` with a Stitch-design-matching contact page (form + GDPR consent + residence-of-interest selector) and ship a brand-new `/media` blog surface (index + per-article template) with EN/RO mirrors. Both surfaces must respect the strict CSP in `vercel.json` (`script-src 'self'`, `connect-src 'self'`).

**Editor-driven content.** Stand up Payload v3 as the source of truth for `/media` posts (with EN/RO localization), so non-technical editors can publish news, journal entries, and market commentary without a code change. The static marketing site stays fast and SEO-friendly; only post content becomes dynamic.

## Non-goals

- Rebuilding `/index`, `/about`, `/projects` from scratch — those are already on the new design and will only receive re-ports if a newer Stitch handoff is detected.
- Migrating the entire site to Next.js (covered as architecture option A, but not the recommended path).
- A general-purpose page builder; Payload manages `/media` posts and authors only — marketing pages stay in HTML.
- Multi-locale beyond EN+RO (e.g., FR, DE) — schema will be locale-aware but only two locales seeded.
- Server-side form processing in Phase 1 — the contact form posts to Formspree (or equivalent third-party endpoint) inside the existing CSP `connect-src` allowlist (will need to be widened — see Risks).
- Fixing the 54 pre-existing failing tests targeting the old design fingerprint (`tests/header-footer.test.js`, `tests/homepage-sections.test.js`, `tests/projects-page.test.js`, `tests/main.test.js`, `tests/css-tokens.test.js`). Listed in Decisions.

---

## Decisions needed before Phase 1

These seven questions block Phase 1 kickoff. Each carries a planner recommendation; user can override.

| # | Question | Recommendation | Why |
|---|----------|----------------|-----|
| 1 | **Payload architecture: A (Next.js full migration) / B (separate headless API + build-time fetch) / C (runtime browser fetch)?** | **B** | Preserves the static Vite MPA (no rewrite of ~1200-line HTML files), keeps SEO clean (per-slug HTML files at build time), and isolates CMS risk to its own deploy. A is correct long-term but is a 3–5x larger effort. C breaks SEO and `connect-src 'self'` CSP. |
| 2 | **DB: MongoDB vs Postgres? Existing managed account?** | **Postgres on Neon or Supabase** | If the user already has a Vercel Postgres / Supabase / Neon account, reuse it. Postgres is easier to back up and query ad-hoc; Payload v3 has a stable Postgres adapter. MongoDB Atlas free tier is fine if no Postgres exists. **Need user confirmation on which provider.** |
| 3 | **Media storage: S3 / R2 / Supabase Storage / Vercel Blob?** | **Cloudflare R2** | Zero egress fees (matters once `/media` images are served from origin), S3-compatible API works with `@payloadcms/storage-s3` adapter. Fallback: Supabase Storage if user is already on Supabase. |
| 4 | **Payload hosting: Railway / Fly / Render / Vercel?** | **Railway** | Simplest persistent Node deploy, integrated Postgres add-on, predictable pricing. Vercel is viable but Payload's admin upload flow on serverless has historically been awkward. Fly works too but adds region/volume management. |
| 5 | **Auth model: single editor account vs multi-user with roles?** | **Multi-user, two roles: `admin` + `editor`** | Trivial to set up in Payload, future-proofs handing the keys to a marketing hire. Single-account is a foot-gun (password rotation, no audit trail). |
| 6 | **Pre-existing failing tests (54 tests against the old design): rewrite during this work or defer?** | **Defer to a separate cleanup PR** | These tests fail because the site moved to the Stitch design; rewriting them is out of scope for this CMS work. File a tracking issue. Confirm with user — if they want green CI before merge, add ~6h to Phase 0. |
| 7 | **"Updated HTML design for some pages" — is the handoff zip yet to drop, or did I miss it?** | **Ask the user before Phase 0.** | I do not see new files in `/Landmark/` newer than `index.html`, `about.html`, `projects.html` mtimes. Phase 0 cannot start until the handoff is on disk OR the user confirms there's nothing new. |

---

## Architecture choice (A / B / C comparison)

| Dimension | A. Next.js migration | **B. Headless Payload + build-time fetch (RECOMMENDED)** | C. Runtime browser fetch |
|---|---|---|---|
| Static marketing pages | Rewritten as React components | **Untouched HTML** | Untouched HTML |
| Test suite impact | Breaks `i18n-parity.test.js`, `i18n-routing.test.js`, header/footer tests — ~50+ tests need rewriting | **Parity tests still apply** to generated `media.html` + `ro/media.html` | Parity test breaks (no static `media.html`) |
| `/media` SEO | Native (RSC) | **Native** (pre-rendered HTML at build) | Broken (content injected client-side, indexer misses it) |
| Dev complexity | High (full rewrite) | **Medium** (one new Vite plugin/script + Payload deploy) | Low (just a fetch in JS) |
| Editor UX | Same Payload admin | **Same Payload admin** | Same Payload admin |
| Cutover risk | Site-wide regression risk | **Risk isolated to `/media`** | Low risk but bad UX |
| Hosting | Vercel (Next.js) | Vercel (static) + Railway (Payload) | Vercel (static) + Railway (Payload) |
| Build time | Fast (incremental) | **Adds ~5-30s** to fetch posts + emit per-slug HTML | None |
| CSP impact | None new | None new (build-time fetch is server-side) | **Breaks `connect-src 'self'`** unless we add Payload origin |
| Long-term flexibility | Highest | Medium | Low |
| Effort estimate | ~80–120h | **~40–55h** | ~20h but accrues debt |

**Default: Track B.** Concrete shape:
- Static site stays exactly as is (Vite MPA → Vercel static).
- Payload v3 lives in `/cms/` (new sibling app, own `package.json`), deployed independently to Railway.
- A new pre-build script (`scripts/build-media.mjs`) runs before `vite build`. It fetches posts from Payload's REST API for both EN and RO locales, then emits `media.html`, `ro/media.html`, `media/<slug>.html`, `ro/media/<slug>.html` from a Handlebars/EJS-style template. Generated files are added to `vite.config.js` `rollupOptions.input`.
- Vercel rewrites get extended to map `/media` and `/ro/media` and slug variants.

---

## Phase 0 — Detect updated handoffs and re-port

**Goal:** bring the live root pages back into sync with `/Landmark/*.html` if any are newer; re-mirror RO.

1. **Inventory handoff freshness** (no file path — script).
   - Action: run `stat -f '%m %N' Landmark/*.html *.html ro/*.html` and compare mtimes; produce a "stale list".
   - Why: the user said "I have updated the HTML design for some pages" but no new files are visible. Confirm what's actually changed.
   - Risk: LOW.

2. **Confirm with user** what's stale before touching anything (Decision #7).
   - Why: avoid clobbering edits that are deliberate divergences from the handoff.
   - Risk: LOW (procedural).

3. **For each stale page, re-port** (Files: `index.html`, `about.html`, `projects.html` as needed).
   - Action: copy `Landmark/<Page>.html` → root, then apply the standard rewrite pass:
     - `public/...` → `/...`
     - `About.html` → `/about`, `Landmark 4.html` → `/projects`, `The Willows.html` → `#`, etc.
     - Inject `<a class="skip-link" href="#main-content">`
     - Wrap content in `<main id="main-content">`
     - Add `<link rel="alternate" hreflang="en" href="/<page>">` and `hreflang="ro"`
     - Insert `[data-lang-switcher]` block matching `index.html` lines 170–174
   - Why: stay aligned with the existing pattern documented in `memory/feedback_i18n_parity.md`.
   - Dependencies: Step 2.
   - Risk: MEDIUM — easy to miss a path rewrite; lean on grep `grep -n 'public/' index.html`.

4. **Mirror to `/ro/<page>.html`** (Files: `ro/index.html`, `ro/about.html`, `ro/projects.html`).
   - Action: clone EN, set `<html lang="ro">`, swap hreflang/switcher targets, translate visible copy. Keep all classes, asset paths, `data-*` hooks identical so `tests/i18n-parity.test.js` stays green.
   - Why: parity rule from memory file.
   - Dependencies: Step 3.
   - Risk: MEDIUM — translation drift causes parity test failures (section/h1/h2/img counts must match).

5. **Run parity + routing tests.**
   - Action: `npm test -- i18n-parity i18n-routing`.
   - Why: catch parity breakage before moving on.
   - Risk: LOW.

**Phase 0 output:** zero or N updated EN+RO page pairs, both test files still 47/47 green.

---

## Phase 1 — /contact (EN + RO)

**Goal:** replace `contact.html` (still on the old design, ~3.7KB) with a new Stitch-aligned page, plus a fresh `ro/contact.html` mirror, both registered in `vite.config.js` and `vercel.json`.

1. **Wait for handoff** (File: `Landmark/Contact.html`).
   - Action: prompt user to drop a Stitch design for `/contact`. If no handoff is forthcoming, derive a contact layout from `index.html`'s nav/footer (lines 148–179) plus a 2-column form + map/address card pattern matching the brand tokens (`--accent`, `--primary`, Lato + Roboto + Material Symbols).
   - Risk: MEDIUM (design freshness).

2. **Port `Contact.html` → root `contact.html`** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/contact.html`).
   - Action: same rewrite pass as Phase 0 step 3. Form fields:
     - `name` (text, required)
     - `email` (email, required)
     - `phone` (tel, optional, `pattern` for intl format)
     - `residence` (select: Landmark 4 / The Willows / The Grove / Other)
     - `message` (textarea, required)
     - `gdpr` (checkbox, required, label links to `/privacy` placeholder)
   - Form action: Formspree endpoint via env-injected URL (Vite `import.meta.env.VITE_FORMSPREE_URL`) — avoids hardcoding.
   - Add ARIA: `aria-required`, `aria-describedby` for error hints, `aria-live="polite"` status region.
   - Dependencies: Step 1.
   - Risk: MEDIUM — Formspree origin must be added to `connect-src` in **both** the meta-CSP inside the HTML and `vercel.json` headers, OR submit via standard form POST (no fetch) which avoids `connect-src` entirely. Recommend the form-POST path.

3. **Mirror `ro/contact.html`** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/ro/contact.html`).
   - Action: clone EN, translate labels (Nume / Email / Telefon / Reședință de interes / Mesaj / Sunt de acord cu Politica de confidențialitate), set `<html lang="ro">`, swap hreflang.
   - Dependencies: Step 2.
   - Risk: LOW.

4. **Register in `vite.config.js`** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/vite.config.js`).
   - Action: add `roContact: resolve(__dirname, 'ro/contact.html')` to `rollupOptions.input` (note: `contact` already present).
   - Risk: LOW.

5. **Add Vercel rewrite** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/vercel.json`).
   - Action: add `{ "source": "/ro/contact", "destination": "/ro/contact.html" }`.
   - Risk: LOW.

6. **Add to parity test** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/tests/i18n-parity.test.js`).
   - Action: append `{ en: 'contact.html', ro: 'ro/contact.html', label: 'contact' }` to the `pairs` array (line 15).
   - Risk: LOW.

**Phase 1 output:** new `/contact` + `/ro/contact` live, parity test extended (now 32 cases passing).

---

## Phase 2 — /media MVP (static placeholder until CMS lands)

**Goal:** ship the page shell (index + article template) with hardcoded fixture posts, so the design is reviewable and the URL space is reserved before Payload exists. This phase produces the templates Phase 4 will fill from the CMS.

1. **Wait for / scaffold handoff** (Files: `Landmark/Media.html`, `Landmark/Media Article.html`).
   - Action: ask user for Stitch handoff. If unavailable, derive: hero band + featured post card + 3-col card grid + category filter pills + pagination, matching journal-card pattern in `index.html` lines 112–116.
   - Risk: MEDIUM.

2. **Build `/media` index** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/media.html`).
   - Action: structure:
     - Reuse nav/footer from `index.html`.
     - Hero with eyebrow "Journal · Press · Insights", h1 "Media".
     - Featured post (top, full-bleed).
     - Filter pills: All / Press / Journal / Market.
     - Grid of 6 `<article class="journal-card">` cards (title, eyebrow tag, hero img, date, excerpt, "Read more" CTA).
     - Pagination footer (placeholder; real pagination wired in Phase 4).
     - Add `<link rel="alternate" type="application/rss+xml" href="/media/rss.xml">` (RSS comes in Phase 6).
   - Use 6 hardcoded fixture posts in `data/media-fixtures.json` so layouts are visible.
   - Risk: LOW.

3. **Build `/media/<slug>` template** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/media/sample-post.html`).
   - Action: long-form article shell: hero image, eyebrow + category, h1 title, byline (`Author · Date · Reading time`), body (h2/h3, p, blockquote, figure with caption, two-image grid), share buttons (mailto, X/Twitter intent URL, LinkedIn share URL — all are plain `<a>` so no CSP impact), "Related posts" 3-card footer.
   - Add Article JSON-LD `<script type="application/ld+json">` placeholder (real values injected in Phase 4).
   - Risk: LOW.

4. **Mirror RO** (Files: `ro/media.html`, `ro/media/sample-post.html`).
   - Translate copy; identical structure.
   - Risk: LOW.

5. **Vite + Vercel registration** (Files: `vite.config.js`, `vercel.json`).
   - Add `media`, `roMedia`, sample slug entries to `rollupOptions.input`.
   - Add rewrites: `/media`, `/ro/media`, `/media/:slug`, `/ro/media/:slug`.
   - Risk: LOW.

6. **Update nav** in `index.html`, `about.html`, `projects.html`, `contact.html`, plus all RO mirrors: change the existing `<a class="nav-link" href="#">Media</a>` (line 163 of `index.html`) to `href="/media"`.
   - Risk: LOW but easy to forget on one page — grep for `>Media<`.

7. **Extend parity test** with `media` and `media/sample-post` pairs.

**Phase 2 output:** `/media` + `/ro/media` + one sample article live with fixtures. Parity test now ~38 cases.

---

## Phase 3 — Payload CMS scaffold (admin app, schemas, auth, media adapter)

**Goal:** stand up Payload v3 in `/cms/` as a separate Node app with Postgres + R2, two roles, three collections.

1. **Scaffold Payload app** (Dir: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/cms/`).
   - Action: `npx create-payload-app@latest cms --template blank --db postgres`.
   - Creates `cms/package.json`, `cms/payload.config.ts`, `cms/src/` (Next.js app for the admin UI).
   - Add `cms/.env.example` listing `DATABASE_URI`, `PAYLOAD_SECRET`, `S3_*` vars.
   - Risk: MEDIUM — Payload v3 is a Next.js app under the hood; ensure it does not conflict with the static site's deploy (it won't, because it's a sibling deploy on Railway, not Vercel).

2. **Configure localization** (File: `cms/payload.config.ts`).
   - Action:
     ```ts
     localization: {
       locales: ['en', 'ro'],
       defaultLocale: 'en',
       fallback: true,
     }
     ```
   - Why: lets us mark fields as `localized: true` instead of `_en`/`_ro` field pairs.
   - Risk: LOW.

3. **Define `Posts` collection** (File: `cms/src/collections/Posts.ts`).
   - Fields:
     - `title` (text, **localized**, required)
     - `slug` (text, required, unique, hook auto-generates from EN title)
     - `excerpt` (textarea, **localized**, max 280 chars)
     - `heroImage` (upload, relation to `Media`, required)
     - `body` (richText with Lexical, **localized**, allow inline images, embeds, blockquote)
     - `category` (relationship → `Categories`, required)
     - `author` (relationship → `Authors`, required)
     - `publishedAt` (date)
     - `status` (select: `draft` | `published`, default `draft`)
     - `seo` group: `metaTitle` (localized), `metaDescription` (localized), `ogImage` (upload)
   - Versioning: enable drafts (`versions: { drafts: true }`) so editors can preview before publish.
   - Risk: MEDIUM — rich-text body shape will drive the renderer in Phase 4; lock the schema early.

4. **Define `Authors` collection** (File: `cms/src/collections/Authors.ts`).
   - Fields: `name`, `bio` (localized), `avatar` (upload), `role` (text), `socials` (array of `{platform, url}`).
   - Risk: LOW.

5. **Define `Categories` collection** (File: `cms/src/collections/Categories.ts`).
   - Fields: `name` (localized), `slug`, `description` (localized).
   - Seed with: Press, Journal, Market.
   - Risk: LOW.

6. **Define `Media` collection** with R2 adapter (File: `cms/src/collections/Media.ts` + `cms/payload.config.ts`).
   - Action: install `@payloadcms/storage-s3`, configure with R2 endpoint + bucket. Image sizes: `thumb` (400w), `card` (800w), `hero` (1600w), `og` (1200x630).
   - Risk: MEDIUM — R2 credential handling; never commit; verify upload + delete round-trips.

7. **Auth + roles** (File: `cms/src/collections/Users.ts`).
   - Fields: `email`, `name`, `role` (select: `admin` | `editor`).
   - Access control: only `admin` can create/delete users; `editor` can CRUD posts but not delete other authors' drafts.
   - Risk: MEDIUM — role logic is easy to misconfigure; add unit tests with Payload's local API.

8. **Deploy to Railway** (no file).
   - Action: connect repo, deploy `/cms`, attach Postgres add-on, set env vars, run first migration. Confirm admin UI loads at `https://cms-landmark.up.railway.app/admin`.
   - Risk: HIGH — first-deploy gotchas (DB SSL, R2 CORS, secret mismatch). Allocate buffer.

9. **CORS + API token** (File: `cms/payload.config.ts`).
   - Action: enable `cors: ['https://landmark.example']`. Generate a read-only API token for the build pipeline (`BUILD_FETCH_TOKEN`).
   - Risk: MEDIUM — token leakage. Store in Vercel project env, not in repo.

**Phase 3 output:** Payload admin live, three collections, EN/RO locales, two roles, R2 uploads working, read-only API token issued.

---

## Phase 4 — Wire /media to Payload (build-time fetch, per-slug pages, RO locales)

**Goal:** replace fixtures with real CMS data via a pre-build script, generating per-slug HTML.

1. **Build-time fetch script** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/scripts/build-media.mjs`).
   - Action: Node script that:
     - Reads `PAYLOAD_API_URL` + `BUILD_FETCH_TOKEN` from env.
     - For each locale in `['en','ro']`, fetches `/api/posts?where[status][equals]=published&locale=<l>&depth=2`.
     - Validates the response with a Zod schema (defensive — never trust external data).
     - Renders each post through a template using a small templating helper (string-template or `eta`).
     - Writes `media.html`, `ro/media.html`, `media/<slug>.html`, `ro/media/<slug>.html` to disk before Vite runs.
     - Generates `data/media-manifest.json` (slug list) for Vite to consume.
   - Risk: HIGH — failure mode if Payload is down: build must fail loudly OR fall back to last-known-good cache (`scripts/.media-cache.json`). Pick "fail loud + cache fallback with banner".

2. **Index + article templates** (Files: `templates/media-index.html`, `templates/media-article.html`).
   - Action: extract Phase 2 HTML into templates with `{{title}}`, `{{body}}`, etc. The `body` rich text is serialized from Payload Lexical → HTML using `@payloadcms/richtext-lexical` HTML serializer.
   - Risk: MEDIUM — Lexical → HTML serialization can drop custom blocks (figure with caption, embeds). Test with seeded fixtures.

3. **Hook into Vite build** (File: `package.json`).
   - Action: change `"build"` to `"node scripts/build-media.mjs && vite build"`. Add `"build:media"` for ad-hoc runs.
   - Add a Vite plugin that dynamically injects generated slug HTML files into `rollupOptions.input` based on `data/media-manifest.json`.
   - Risk: MEDIUM — slug-list drift between fetch and Vite input. Single source of truth = manifest file.

4. **RO post handling.**
   - Action: if a post has no RO translation, the script should **skip** the RO output and the EN article gets `<link rel="alternate" hreflang="ro" href="/media/<slug>">` (self-reference) instead of pointing to a missing RO page. The RO index excludes EN-only posts.
   - Why: parity test currently demands matching RO files; we relax that for `/media/<slug>` by NOT registering EN-only slugs in the RO parity sub-suite.
   - Risk: MEDIUM — parity test needs a carve-out for slugs.

5. **Local dev path.**
   - Action: `npm run dev` skips the build script and uses fixtures from `data/media-fixtures.json`. Document in README. Optionally support `MEDIA_SOURCE=cms npm run dev` to pull live.
   - Risk: LOW.

6. **Deploy hook.**
   - Action: add Vercel deploy hook URL as a Payload `afterChange` hook on `Posts` collection so publishing triggers a redeploy. Debounce 60s to batch multi-edits.
   - Risk: MEDIUM — runaway redeploys if hook is misconfigured. Add server-side debounce in a Payload custom endpoint, not Vercel.

**Phase 4 output:** real posts render at `/media` and `/media/<slug>` (and RO equivalents) on every deploy.

---

## Phase 5 — Editor workflow (drafts, preview, publish, redeploy hook)

**Goal:** make the day-to-day editor experience pleasant and safe.

1. **Draft preview links** (File: `cms/src/collections/Posts.ts` — `admin.preview` config).
   - Action: configure `admin.preview = (doc) => 'https://landmark.example/api/preview?slug=' + doc.slug`. Build a tiny preview proxy on Vercel (Vercel Edge Function) that fetches the draft from Payload by slug+locale and renders the article template inline.
   - Risk: HIGH — this is the only piece that needs server-side rendering on Vercel; it adds a Function. Alternative: editors preview inside Payload's admin (Payload supports live preview iframes natively). **Recommend the native live-preview iframe** to avoid adding a Vercel Function.
   - Risk: MEDIUM with native preview.

2. **Publish flow.**
   - Editor edits post → Save Draft (autosave) → Preview (live iframe) → Publish (sets `status=published`) → `afterChange` hook fires deploy.
   - Risk: LOW.

3. **Media library hygiene.**
   - Add admin filters for unused media. Schedule a monthly cleanup task (out of scope; document for later).
   - Risk: LOW.

4. **Editor docs** (File: `/Users/vanderbilt/Downloads/04_Development/Vibe/Landmark/docs/editor-guide.md`).
   - Action: 1-page screenshot guide: log in, create post, add hero, write EN, switch locale to RO, translate, set category/author, save draft, preview, publish.
   - Risk: LOW.

**Phase 5 output:** editor can ship a post end-to-end without dev help.

---

## Phase 6 — SEO + sitemap + structured data + RSS

**Goal:** make `/media` discoverable and shareable.

1. **Per-post SEO** (File: `scripts/build-media.mjs`).
   - Action: emit per-post `<title>`, `<meta description>`, `og:title`, `og:description`, `og:image` (1200x630 served from R2), `og:locale` (`en_US` / `ro_RO`), `twitter:card=summary_large_image`, and `Article` JSON-LD with `headline`, `datePublished`, `author`, `image`, `publisher`.
   - Risk: LOW.

2. **hreflang per post.**
   - If both locales exist for a slug: cross-link via hreflang. If only one: self-reference + `x-default = en`.
   - Risk: LOW.

3. **Sitemap** (File: `scripts/build-sitemap.mjs`).
   - Action: emit `sitemap.xml` containing all static pages + all CMS slugs (EN+RO). Run after `build-media.mjs`.
   - Risk: LOW.

4. **RSS feed** (File: `scripts/build-rss.mjs`).
   - Action: emit `media/rss.xml` (EN) and `ro/media/rss.xml` (RO) with the 20 most recent posts.
   - Risk: LOW.

5. **Robots.txt review** (File: `public/robots.txt` — check if exists; if not, create).
   - Action: allow all, point to sitemap.
   - Risk: LOW.

**Phase 6 output:** posts indexable, shareable, syndicatable.

---

## Tests to add per phase

| Phase | Tests |
|---|---|
| 0 | Re-run existing `i18n-parity` (24) + `i18n-routing` (23) = 47 must stay green. |
| 1 | Add `contact.html` + `ro/contact.html` to `pairs` array in `tests/i18n-parity.test.js` (+8 cases). New test file `tests/contact-form.test.js`: form has correct field names, GDPR checkbox is required, `aria-required` set, `<select>` has the four residence options. |
| 2 | Add `media` + `media/sample-post` to parity pairs (+16 cases). New `tests/media-page.test.js`: index has hero, ≥1 featured post, ≥3 cards, filter pills, RSS `<link>`. New `tests/media-a11y.test.js`: skip link, h1 once, alt on all imgs, focus order. |
| 3 | New `cms/tests/collections.test.ts`: Posts schema validates; Authors required fields; role access control denies non-admin user delete. Use Payload local API. |
| 4 | New `tests/build-media.test.js`: given a fixture API response, the script writes expected files; given a missing RO translation, no RO file emitted; given an unreachable API and an existing cache, build proceeds with banner. Zod schema rejects malformed payloads. |
| 5 | Manual editor walkthrough recorded as `tests/editor-flow.md` checklist. Optional Playwright e2e against staging Payload + preview. |
| 6 | New `tests/seo-meta.test.js`: every generated post has og:image, og:title, JSON-LD `Article`, valid hreflang. New `tests/sitemap.test.js`: sitemap.xml contains all static + CMS URLs. |

CMS API contract test: Phase 4 ships a Zod schema that's used both at build-time and in tests, so a shape change in Payload fails the build immediately rather than producing broken HTML.

---

## Risks

| Severity | Risk | Mitigation |
|---|---|---|
| **HIGH** | Build-time CMS fetch fails on every deploy if Payload is unreachable. | Cache last-good response in `scripts/.media-cache.json`; on fetch failure use cache + emit banner; alert via Slack webhook. |
| **HIGH** | Payload schema change silently breaks build. | Zod-validate API response in `build-media.mjs`; CI test runs against a fixture matching production shape. |
| **HIGH** | First Railway deploy of Payload fails (DB SSL, R2 CORS, secret mismatch). | Allocate 4h buffer; document each env var in `cms/.env.example`; test admin login + media upload as smoke check. |
| **HIGH** | Pre-existing 54 failing tests get conflated with new work. | Decision #6 — defer; tag this PR's CI to ignore pre-existing failures or rewrite them in a separate PR. |
| **MED** | Formspree CSP issue: `connect-src 'self'` blocks fetch. | Use plain `<form action="https://formspree.io/...">` POST (no fetch); avoids CSP entirely. Document. |
| **MED** | RO parity test fails when an EN-only post has no RO translation. | Carve out `/media/<slug>` from the strict parity rule (only enforce parity for index page templates, not per-post). |
| **MED** | Lexical rich-text renderer drops custom blocks (figure, embed). | Lock the body schema in Phase 3; round-trip test in Phase 4 with seeded fixtures covering all block types. |
| **MED** | Editor publishes with empty SEO fields. | Add Payload validation: `seo.metaTitle` and `seo.metaDescription` required when `status=published`. |
| **MED** | Stale slug — editor renames post, old URL 404s. | Add `redirects` collection (Payload) → emit Vercel redirects at build time. |
| **MED** | Vercel deploy hook spammed on bulk edits. | Debounce 60s in a custom Payload endpoint. |
| **LOW** | Tailwind CDN (used by current pages) blocks under stricter CSP. | Already accommodated (`script-src 'self'` blocks Tailwind CDN — verify in browser; if blocked, switch to compiled Tailwind via Vite plugin). Track separately. |
| **LOW** | RSS feed validators reject mixed locales. | Separate EN and RO feeds (already planned). |

---

## Estimate per phase

Assumes: solo dev, recommended architecture B, Postgres on Neon, R2 for media, Railway for Payload, no surprise design rework. Add 30% buffer for first-time Payload v3 setup.

| Phase | Hours | Notes |
|---|---|---|
| 0. Re-port handoffs | **3–6** | Depends on N pages stale (per-page ~1.5h: port + RO mirror + paths). |
| 1. /contact EN+RO | **5–7** | Half is design-driven; faster if handoff exists. |
| 2. /media MVP shell | **6–9** | Index + article + RO mirrors + nav updates. |
| 3. Payload scaffold | **10–14** | Schemas + R2 + roles + first deploy. Highest variance. |
| 4. Build-time wiring | **8–12** | Pre-build script + Zod schema + Lexical→HTML + Vite plugin + cache fallback. |
| 5. Editor workflow | **3–5** | Mostly Payload config + docs. Native live-preview keeps it small. |
| 6. SEO + sitemap + RSS | **4–6** | Three small generator scripts + tests. |
| **Total** | **~39–59h** | Roughly one full sprint. |

Optional cleanup (Decision #6): rewriting the 54 failing legacy tests = +6–10h.

---

## Rollout / cutover plan

1. **Branches.** One PR per phase, all stacked on `main`. Phase 0–2 mergeable as static-only changes (no infra dependencies). Phase 3 requires the Railway deploy and gets its own PR. Phase 4–6 land sequentially.
2. **Staging Payload first.** Spin up `cms-staging.up.railway.app` before production. Editors test there for 2–3 days.
3. **Feature flag.** Add a `MEDIA_SOURCE=cms|fixtures` env var in `scripts/build-media.mjs`. Production stays on `fixtures` until Phase 4 is verified, then flip.
4. **DNS / cutover.** None required for the static site (no domain change). Payload uses a subdomain (`cms.landmark.example`) — set up after Phase 3.
5. **Rollback.** If Phase 4 misbehaves, flip `MEDIA_SOURCE=fixtures` and redeploy — instant rollback to the last fixture set without touching Payload.
6. **Monitoring.** After Phase 4, add a daily cron (GitHub Action or Vercel Cron) that hits `GET /api/posts?status=published&limit=1` against Payload and pings on failure. Add Vercel deploy notifications on build failure.
7. **Editor handover.** After Phase 5, schedule a 30-min walkthrough with the marketing owner. Use `docs/editor-guide.md` as the script.

---

## Out of scope (and why)

- **Search / full-text on `/media`.** Adds Algolia or Postgres FTS — defer until ≥30 posts.
- **Comments on posts.** Not requested; adds moderation burden.
- **Newsletter signup.** Likely a Mailchimp/Buttondown embed; treat as a Phase 7 addition.
- **AMP / PWA.** Out of scope; static HTML is already fast.
- **Analytics rebuild.** Whatever exists today carries over unchanged.
- **Author public pages (`/media/author/<slug>`).** Schema supports it; not in MVP.
- **Tag taxonomy** (separate from category). YAGNI until editors ask.
- **Migration of legacy WordPress posts.** None mentioned.
- **Fixing the 54 failing pre-existing tests.** See Decision #6.

---

## Files referenced

- `package.json`
- `vite.config.js`
- `vercel.json`
- `index.html`, `about.html`, `projects.html`, `contact.html`
- `ro/index.html`, `ro/about.html`, `ro/projects.html`
- `tests/i18n-parity.test.js`, `tests/i18n-routing.test.js`
- `Landmark/` (Stitch handoff bundle directory; future drops should land here)
- `~/.claude/projects/-Users-vanderbilt-Downloads-04-Development-Vibe/memory/feedback_i18n_parity.md` (EN/RO parity rule)

---

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes / no / modify)
