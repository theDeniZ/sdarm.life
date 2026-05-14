# Known gotchas

## Next.js / React

- **`fetch().json<T>()`** — generic `.json<T>()` is Cloudflare Workers-only. In Next.js always use `(await res.json()) as T`.
- **`export const runtime = 'edge'` must NOT appear in any file** — `@opennextjs/cloudflare` builds the entire app into a single Cloudflare Worker that already runs on the edge runtime. Per-page edge declarations cause the build to fail. Remove them from all page files.
- **Internal navigation must use `<Link>`** — plain `<a href>` causes a full page reload. Use `next/link` for SPA navigation.
- **Passing server env vars to client components** — `apps/web` uses server-only env vars (`API_URL`, `R2_URL`). Pass them as props from the server component. Do not add `NEXT_PUBLIC_` prefixes. Example: `Footer` receives `apiUrl={process.env.API_URL}`.
- **`BgCanvas` is no longer used on the home page** — removed during the dark theme redesign. The file still exists for potential future use. Do not re-add it to `layout.tsx`.

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

## Local dev

- **`.dev.vars` vs `wrangler.jsonc`** — local secrets go in `apps/api/.dev.vars` (auto-loaded by `wrangler dev`). The `dev.vars` field inside `wrangler.jsonc` is not valid.
