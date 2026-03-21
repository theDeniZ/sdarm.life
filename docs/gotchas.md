# Known gotchas

## Next.js / React

- **`fetch().json<T>()`** — generic `.json<T>()` is Cloudflare Workers-only. In Next.js always use `(await res.json()) as T`.
- **`export const runtime = 'edge'` in layout breaks the build** — set it only on individual page files, never on `layout.tsx`.
- **Internal navigation must use `<Link>`** — plain `<a href>` causes a full page reload. Use `next/link` for SPA navigation.
- **Passing server env vars to client components** — `apps/web` uses server-only env vars (`API_URL`, `R2_URL`). Pass them as props from the server component. Do not add `NEXT_PUBLIC_` prefixes. Example: `Footer` receives `apiUrl={process.env.API_URL}`.
- **`BgCanvas` is no longer used on the home page** — removed during the dark theme redesign. The file still exists for potential future use. Do not re-add it to `layout.tsx`.

## Build / dependencies

- **Next.js version** — both apps use **15.2.2** (not 16). Next.js 16 Turbopack fails inside `vercel build` in a monorepo.
- **`@cloudflare/next-on-pages`** — requires `vercel@47.0.4` pinned as devDep. Later versions break the build. Requires `nodejs_compat` flag set in the Pages project settings.
- **`setupDevPlatform` in `next.config.ts`** — use `.then()`, not top-level `await`. Next.js 15 compiles config to CJS.
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
