# Known gotchas

## Next.js / React

- **`fetch().json<T>()`** — generic `.json<T>()` is Cloudflare Workers-only. In Next.js always use `(await res.json()) as T`.
- **`export const runtime = 'edge'` must NOT appear in any file** — `@opennextjs/cloudflare` builds the entire app into a single Cloudflare Worker that already runs on the edge runtime. Per-page edge declarations cause the build to fail. Remove them from all page files.
- **Next 16 root layout must render `<html>` and `<body>`** — deferring them to `[locale]/layout.tsx` (the Next 15 pattern) now throws `Missing <html> and <body> tags in the root layout` and renders the default 404. Each public app's `app/layout.tsx` reads the locale with `await getLocale()` from `next-intl/server` and renders the outer shell; `[locale]/layout.tsx` returns a fragment with `<ThemeProvider />` + providers + Navbar/Footer.
- **Internal navigation must use `<Link>`** — plain `<a href>` causes a full page reload. Use `next/link` for SPA navigation.
- **Passing server env vars to client components** — `apps/web` uses server-only env vars (`API_URL`, `R2_URL`). Pass them as props from the server component. Do not add `NEXT_PUBLIC_` prefixes. Example: `Footer` receives `apiUrl={process.env.API_URL}`.
- **`BgCanvas` is no longer used on the home page** — removed during the dark theme redesign. The file still exists for potential future use. Do not re-add it to `layout.tsx`.
- **`apps/admin` relative-URL fetches only work from Client Components** — `apps/admin/app/lib/api.ts` sets `API = ''` because every admin fetch goes through the same-origin `/api/v1/*` proxy route handler. A `fetch('/api/v1/...')` call resolves fine in the browser (relative to `window.location`) but throws when it runs during server-side rendering — an async Server Component has no browsing context to resolve a relative URL against, and Next.js surfaces the crash as a generic 500. This is exactly what broke `apps/admin/app/songbooks/[id]/page.tsx` and `.../songs/page.tsx` (issue #104), plus `apps/admin/app/songs/[id]/page.tsx` and `.../songbooks/[id]/songs/new/page.tsx` (same root cause, found and fixed alongside the songbook card grid redesign) — while `posts/[id]/page.tsx` and `treasures/[id]/page.tsx` worked fine because they were already `'use client'` + `useParams()` + `useEffect()`. Any new admin edit/detail page must follow the same client-component pattern, not the Next.js default of an async Server Component.

## Build / dependencies

- **Next.js version** — all apps use **16.x**. Use `"build": "next build --webpack"` in every app's `package.json` — Turbopack is the Next.js 16 default but fails inside `vercel build` in a pnpm monorepo. The `--webpack` flag bypasses Turbopack for CI/Cloudflare builds while keeping Turbopack for `next dev`.
- **`turbopack.root` in `next.config.ts`** — required for `next dev` (local development) in a pnpm monorepo. Set to `path.resolve(process.cwd(), '../..')` (the monorepo root). Not needed for production builds since `--webpack` skips Turbopack entirely.
- **`@opennextjs/cloudflare`** — replaces the archived `@cloudflare/next-on-pages`. Deploys to **Cloudflare Workers** (not Pages). Output is `.open-next/worker.js` + `.open-next/assets/`. Each app needs a `wrangler.jsonc` (pointing at `.open-next/worker.js`) and an `open-next.config.ts`. Build with `pnpm pages:build` (`opennextjs-cloudflare build`).
- **`open-next.config.ts` is required** — the build fails without it. Use `staticAssetsIncrementalCache` (not `r2IncrementalCache`) for apps that don't use ISR — it requires no extra R2 binding.
- **`initOpenNextCloudflareForDev()` in `next.config.ts`** — replaces `setupDevPlatform()`. Call it unconditionally at the top level (no `if (process.env.NODE_ENV === 'development')` guard, no `.then()`).
- **`global_fetch_strictly_public` compatibility flag** — required in `wrangler.jsonc` for `@opennextjs/cloudflare`.
- **Node 24 `cpSync` on Docker overlay/bind-mount** — `fs.cpSync` with `recursive:true` on a directory fails with EACCES on overlay filesystems in Node 24. `tools/patch-cp.cjs` patches it to use `cp -r`. All `pages:build` scripts load it via `NODE_OPTIONS='--require ../../tools/patch-cp.cjs'`.
- **Server env vars for Workers** — runtime vars (`API_URL`, `WEB_URL`, etc.) are set in `wrangler.jsonc` under `vars` (and `env.staging.vars` for staging). `NEXT_PUBLIC_*` vars are still build-time only.
- **`drizzle-orm` in `@sdarm/api`** — must be a direct dependency (not just in `@sdarm/db`). Wrangler bundles per-package and won't hoist workspace deps.

## Database / Drizzle

- **Date types** — all date fields from the API are ISO strings (`string | null`), not numbers. Drizzle stores as integer seconds; Hono serializes on the way out.
- **`notInArray(col, [])` is invalid Drizzle SQL** — when `?unused=1` and there are zero used keys, skip the filter entirely (everything is unused, so returning all rows is correct).
- **D1 migrations** — remote migrations run automatically via CI on push to `main`. Local migrations must be applied manually: `./apps/api/node_modules/.bin/wrangler d1 migrations apply sdarm-db --config apps/api/wrangler.jsonc`. Apply before testing locally.

## R2 / images

- **`images` table out of sync** — only images uploaded/deleted via the admin API are tracked. Direct R2 operations (wrangler, CF dashboard) bypass the table and require manual backfill.
- **`images` table backfill** — call `POST /admin/images/backfill` to sync existing R2 objects into D1. For production without admin API: query D1 for all `cover_key`/`thumb_key` in posts and image values in `site_config`, HEAD each `https://images.sdarm.life/{key}` for size, then `wrangler d1 execute --remote --command "INSERT OR IGNORE INTO images ..."`.
- **R2 image cache headers** — new uploads get `Cache-Control: public, max-age=31536000, immutable`. Existing R2 objects have no cache header; apply a Cloudflare Cache Rule on `images.sdarm.life/*` to cover them.
- **Image preview after upload** — keep `URL.createObjectURL(file)` as the preview src. Do not switch to the R2 URL — local `.wrangler/state/` objects aren't served at `images.sdarm.life`. The R2 key is stored correctly regardless.

## i18n / next-intl

- **Dynamic `import()` with template literals breaks webpack** — `await import(\`@sdarm/i18n/messages/${locale}\`)` fails because webpack cannot resolve template strings against the package `exports` map. Use static imports: `import de from '@sdarm/i18n/messages/de'` and a lookup object.
- **`setRequestLocale(locale)` is required** — every server page/layout under `[locale]` must call `setRequestLocale(locale)` before using `getTranslations()`. Without it, `next-intl` cannot determine the active locale in server components.
- **`ConnectedNavbar`/`ConnectedFooter` need `locale` prop** — pass `locale` from the page server component. Without it, the language switcher defaults to `de` and cross-app links won't include the locale prefix.

## YouVersion / Bible

- **`page_size` must be < 100.** `GET /v1/bibles?page_size=100` returns `400 {"message":"page_size must be between 1 and 99"}`. The client caps at 99 (`MAX_PAGE_SIZE`).
- **`format=text` loses verse boundaries.** The passage endpoint returns one undivided blob in text mode. Always request `format=html` and split on the `<span class="yv-v" v="N">` markers.
- **Poetry lines need explicit spacing.** Verses are split across block elements; stripping tags without inserting a space produces run-together words (`мой;я ни в чем`). The parser converts `<br>` and closing `</p>`/`</div>`/`</li>` to a space first.
- **`localized_abbreviation` is not always Latin.** Russian bibles return `НРП`, which sanitises to an empty slug. URL slugs use the non-localized `abbreviation` (`nrt`); the localized one is display-only.
- **Not every Bible ID exists.** `GET /v1/bibles/1` and `/v1/bibles/400` return 404 — IDs are not contiguous and the old hardcoded map from the abandoned D1 implementation was wrong. Always resolve IDs from the live catalog. `catalog.ts` silently drops IDs that no longer resolve.
- **`agreed_dt` on `/v1/licenses` is always `null` for an app key.** It reads like "we have not accepted this license", but it is a *user*-scoped field (note its `yvp_user_id` sibling) that only a "Sign in with YouVersion" token fills in — a flow forbidden by [dsgvo.md](dsgvo.md). An earlier Admin → Bible build rendered "0 of 9 accepted" and a red "License not accepted" badge on every translation while all of them were accepted and readable. Judge readability from the default `/v1/bibles` listing (the `licensed` flag) instead; an unlicensed Bible 403s on a passage fetch, a nonexistent one 404s.
- **YouVersion does not normalise Psalm numbering.** Each Bible is served in its own publisher numbering, so the LXX↔Hebrew remap in `packages/types/src/psalms.ts` is still required — NRT (143) `PSA.22` is "The Lord is my shepherd" while DELUT (51) has it at `PSA.23`. `detectLxxPsalms()` (176 verses at PSA.118) correctly separates the two.
- **Slugs are computed then cached.** Changing slug logic requires bumping the `:v1` suffix in `services/bible/cache.ts` (or deleting the `bible:v:*` KV keys), otherwise stale slugs are served for up to a day.
- **KJV cannot be served and there is nothing to accept.** Bible `1` (KJV) *is* in the platform catalog — it shows on an `all_available` listing — but it is absent from the licensed listing, a passage fetch returns `403 {"message":"Access denied for 1"}`, and `GET /v1/licenses?bible_id=1` returns **HTTP 204**: no license object covering it is exposed to our app key at all. Accepting everything in the developer dashboard does not change this. Verified 2026-07-26. Platform-wide we are licensed for 1,472 of 1,480 Bibles; the other 7 gaps are minority-language New Testaments. Use ASV (`12`, the KJV's own 1901 American revision), Geneva (`2163`), or WEB (`206`) where a KJV-style text is wanted.
- **Do not edge-cache the translation endpoints.** They reflect the admin allowlist. Caching is applied per-route inside `routes/bible.ts` (books/chapters/parallel only), not as a blanket `v1.use('/bible/*', cached(...))` mount — a blanket mount left the site serving the old translation set after an operator changed it, and `purgeCache()`'s local fallback only evicts a single cache variant (production purges by URL through the Cloudflare API, which does evict all).
- **Next's Data Cache lives in `.next`, not just `.next/cache`.** A `fetch(..., { next: { revalidate } })` result survives dev-server restarts and `rm -rf .next/cache`; only removing the whole `.next` directory clears it. This makes a stale API response look like a broken page long after the API is fixed — if a Bible page renders empty while `curl` against the Worker returns data, check the Worker log first: if no request arrives, it is the Next cache, not your code. Treasures uses a 5-minute window for Bible metadata so admin changes surface quickly.

## Local dev

- **`.dev.vars` vs `wrangler.jsonc`** — local secrets go in `apps/api/.dev.vars` (auto-loaded by `wrangler dev`). The `dev.vars` field inside `wrangler.jsonc` is not valid.
