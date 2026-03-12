# sdarm.life — Claude Context

## Project overview

Content-driven web app for an SDA Reform church. Monorepo hosted entirely on Cloudflare. Managed via a dedicated admin panel at `admin.sdarm.life`.

## Monorepo structure

```
sdarm.life/
├── apps/
│   ├── web/        # @sdarm/web   — Next.js 15 public site → sdarm.life
│   ├── admin/      # @sdarm/admin — Next.js 15 admin UI   → admin.sdarm.life
│   └── api/        # @sdarm/api   — Hono Cloudflare Worker → api.sdarm.life
├── packages/
│   └── db/         # @sdarm/db    — shared Drizzle schema + migrations
├── .github/workflows/ci.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

**Tooling:** pnpm workspaces + Turborepo 2. Run everything with `pnpm turbo build`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + `@cloudflare/next-on-pages` |
| Admin UI | Next.js 15 |
| API | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite via Drizzle ORM) |
| Image storage | Cloudflare R2 (`sdarm-images` bucket) |
| Auth | Cloudflare Access (admin domain) + header secrets (API) |
| Monorepo | pnpm workspaces + Turborepo 2 |
| Deployment | Cloudflare Git integration + Wrangler CLI |

## Cloudflare resources

| Resource | Name/ID |
|---|---|
| D1 database | `sdarm-db` — ID `8d498e81-689f-45ac-9128-46106dd87e2d` |
| R2 bucket | `sdarm-images` |
| Worker | `sdarm-api` |
| Pages (web) | `sdarm-web` |
| Pages (admin) | `sdarm-admin` |

Worker bindings (`apps/api/wrangler.jsonc`): `DB` (D1), `IMAGES` (R2), `CF_CLIENT_ID` (secret), `CF_CLIENT_SECRET` (secret).

## Domain routing

| Subdomain | App | Protection |
|---|---|---|
| `sdarm.life` | `apps/web` | Public |
| `admin.sdarm.life` | `apps/admin` | Cloudflare Access (Google login, email allowlist) |
| `api.sdarm.life` | `apps/api` | Public GETs; `/admin/*` requires header secrets |
| `images.sdarm.life` | R2 public bucket | Public |

## Database schema (`packages/db/src/index.ts`)

**`posts`** table: `id`, `title`, `slug` (unique), `excerpt`, `body`, `author`, `video_url`, `cover_key`, `cover_alt`, `is_featured` (boolean), `published_at`, `created_at`, `updated_at`, `deleted_at`

**`siteConfig`** table: `key` (PK), `value`, `updated_at`

**`subscribers`** table: `id`, `email` (unique), `token` (unique), `unsubscribed_at`, `created_at`

**`KNOWN_CONFIG_KEYS`** (single source of truth — both API and admin import this):
`donation_url`, `about_text_1`, `about_text_2`, `about_image_key`, `about_image_alt`, `about_link_url`, `facebook_url`, `whatsapp_url`, `instagram_url`, `youtube_url`

Drizzle `mode: 'timestamp'` stores as integer seconds in SQLite; Hono serializes to ISO strings. All frontend date fields must be typed as `string | null`, not `number`.

## API routes (`apps/api/src/index.ts`)

All routes versioned under `/api/v1`.

### Public
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/posts` | Active posts. `?featured=1` and `?video=1` filters. |
| `GET` | `/api/v1/posts/:slug` | Single post by slug. 404 if deleted. |
| `GET` | `/api/v1/config` | All `site_config` rows as `{ key: value }` map. |
| `GET` | `/api/v1/images/*` | Proxy-serves R2 objects by key path (local dev only). |
| `POST` | `/api/v1/subscribe` | Subscribe email. 409 if already subscribed (including unsubscribed). |
| `GET` | `/api/v1/unsubscribe` | `?token=` — marks subscriber as unsubscribed. Idempotent. |

### Admin (require `CF-Access-Client-Id` + `CF-Access-Client-Secret` headers)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/admin/posts` | Create post |
| `PATCH` | `/api/v1/admin/posts/:id` | Partial update (any field) |
| `DELETE` | `/api/v1/admin/posts/:id` | Soft-delete: sets `deleted_at = now()` |
| `PUT` | `/api/v1/admin/config/:key` | Upsert site_config key. 400 if unknown key. |
| `POST` | `/api/v1/admin/images/upload` | `multipart/form-data` → R2 → returns `{ key: "uploads/{uuid}.{ext}" }` |
| `GET` | `/api/v1/admin/subscribers` | Active subscribers (no `unsubscribed_at`), newest first. |
| `DELETE` | `/api/v1/admin/subscribers/:id` | Soft-delete: sets `unsubscribed_at = now()`. |

**CORS origins:** `https://sdarm.life`, `https://admin.sdarm.life`, `http://localhost:3000`, `http://localhost:3001`

## Auth model

- `CF_CLIENT_ID` / `CF_CLIENT_SECRET` are plain random hex strings (not CF Access service tokens)
- Stored as GitHub Actions secrets; synced to Worker via `sync-secrets` CI job on every push to `main`
- Same values set as `NEXT_PUBLIC_CF_CLIENT_ID/SECRET` env vars in admin Pages project
- Local dev: both set to `dev`/`dev` in `apps/api/.dev.vars` and `apps/admin/.env.local`

## Environment variables

### `apps/web`
| Variable | Dev (`.env.local`) | Production fallback |
|---|---|---|
| `API_URL` | `http://localhost:8787/api/v1` | `https://api.sdarm.life/api/v1` |
| `R2_URL` | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life` |

Server-only (no `NEXT_PUBLIC_` prefix). Used in `page.tsx`.

### `apps/admin`
| Variable | Dev (`.env.local`) | Production |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787` | `https://api.sdarm.life` |
| `NEXT_PUBLIC_R2_URL` | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life` |
| `NEXT_PUBLIC_CF_CLIENT_ID` | `dev` | random hex |
| `NEXT_PUBLIC_CF_CLIENT_SECRET` | `dev` | random hex |

Note: `NEXT_PUBLIC_API_URL` has **no `/api/v1` suffix** — components append the full path themselves.

### `apps/api` (local dev only)
`apps/api/.dev.vars` (gitignored, auto-loaded by `wrangler dev`):
```
CF_CLIENT_ID=dev
CF_CLIENT_SECRET=dev
```

## `apps/web` component map

| Component | Type | File |
|---|---|---|
| `page.tsx` | Server (async) | `app/page.tsx` |
| `BgCanvas` | **Client** | canvas grayscale background effect |
| `Navbar` | **Client** | sticky nav with language switcher |
| `HeroSection` | **Client** | featured-posts carousel + static fallback |
| `NewsSection` | Server | 2-col news grid |
| `VideoSection` | Server | 2-col video grid |
| `SongbookSection` | Server | static search + song cards |
| `AboutSection` | Server | 2-col about layout |
| `ProductsSection` | **Client** | book/product cards |
| `Footer` | **Client** | subscribe, donate, socials. Accepts `apiUrl` prop (passed from `page.tsx` via `process.env.API_URL`). |

`page.tsx` fetches `fetchPosts()` + `fetchConfig()` in parallel with `revalidate: 60`. Both return `null` on error → components fall back to static data silently.

Data mappers: `toHeroPost`, `toNewsPost`, `toVideoPost`, `toAboutConfig`, `toFooterConfig`.

### HeroSection carousel

`HeroSection` is a `'use client'` strip carousel. It receives only **featured** posts (`isFeatured = true`) via `posts?: HeroPost[]`. Falls back to a static placeholder if the array is empty.

**`HeroPost` interface:**
| Field | Source | Used in |
|---|---|---|
| `title` | `posts.title` | Detail area (h1) |
| `meta` | formatted date + author | Detail area |
| `body` | `posts.body` | Detail area paragraph |
| `excerpt` | `posts.excerpt` | Strip card preview text (falls back to `title`) |
| `imageUrl` | R2 cover key → URL | Both: hero background + card thumbnail |
| `imageAlt` | `posts.cover_alt` | Alt text |
| `slug` | `posts.slug` | React key |

**Layout:** `.hero` (full-bleed, dark background image + overlay, text bottom-aligned) sits above `.hero-strip-wrap` (full-bleed dark strip). Both use `margin-left: calc(-1 * var(--gl))` / `margin-right: calc(-1 * var(--gr))` to bleed.

**Carousel behaviour:** 5 s auto-cycle, progress bar via CSS animation restarted by React `key`, hero text + background cross-fade (420 ms), strip scrolls horizontally when posts overflow. Card text slides in from right, exits left on `.leaving` class.

**Admin note:** The `excerpt` field is labelled **"Preview Text"** in the PostForm (it drives the card strip text, not a traditional excerpt).

## `apps/admin` component map

| Component | File |
|---|---|
| `AdminShell` | sidebar + main layout wrapper |
| `Sidebar` | nav links, active route via `usePathname()` |
| `PostList` | posts table, featured toggle, soft-delete |
| `PostForm` | create/edit form with auto-slug |
| `ImageUpload` | drag-drop → multipart POST → R2 |
| `ConfigEditor` | iterates `KNOWN_CONFIG_KEYS`, saves on blur |
| `SubscriberList` | active subscribers table with Remove (soft-delete) |

## Styling

No Tailwind, no CSS-in-JS. Pure class-based CSS in `globals.css` per app.

Design tokens (CSS custom properties):
- `--red: #c0392b` — accent
- `--dark: #1a1a1a`, `--gray: #999`, `--mid: #555`, `--text: #2c2c2c`
- `--light: #f7f5f2`, `--border: #e4dfd8`
- `--warm-bg: #d8d2c8`, `--foot-bg: #ece8e2`
- `--gl: 188px`, `--gr: 144px`, `--pw: 1152px` — layout grid
- `--r: 5px` — border radius
- Admin adds: `--sidebar-w: 220px`, `--admin-bg: #f4f2ef`

## Image strategy

All images use Next.js `<Image fill>` inside aspect-ratio containers. `next.config.ts` `remotePatterns`: `images.unsplash.com`, `upload.wikimedia.org`, `images.sdarm.life` (https), `localhost` (http).

`unoptimized` is only set on static fallback Wikimedia/Unsplash URLs — not on R2 images.

## Known gotchas

- **`fetch().json<T>()`** — generic `.json<T>()` is Cloudflare Workers-only. In Next.js use `(await res.json()) as T`.
- **Date types** — all date fields from API are ISO strings (`string | null`), not numbers.
- **`BgCanvas` z-index** — must be `-1` (step 2, below block content). At `0` it covers page text.
- **`.page { background: #fff }`** — required to prevent canvas bleeding through transparent sections.
- **Image preview after upload** — keep `URL.createObjectURL(file)` as preview; don't switch to R2 URL (local `.wrangler/state/` objects aren't on `images.sdarm.life`). R2 key is still stored correctly.
- **`setupDevPlatform` in `next.config.ts`** — use `.then()`, not top-level `await` (Next.js 15 compiles config to CJS).
- **`.dev.vars` vs `wrangler.jsonc`** — local secrets go in `apps/api/.dev.vars` (auto-loaded by Wrangler). The `dev.vars` field inside `wrangler.jsonc` is not valid.
- **D1 migrations in CI** — must use `--remote` flag; without it wrangler defaults to local.
- **`drizzle-orm` in `@sdarm/api`** — must be a direct dependency (not just in `@sdarm/db`); wrangler bundles per-package and won't hoist workspace deps.
- **`@cloudflare/next-on-pages`** — requires `vercel@47.0.4` pinned as devDep (later versions break the build). Requires `nodejs_compat` flag set in Pages project settings.
- **Next.js version** — both apps use **15.2.2** (not 16). Next.js 16 Turbopack fails inside `vercel build` in a monorepo.
- **Passing server env vars to client components** — `apps/web` uses server-only env vars (`API_URL`, `R2_URL`). Client components cannot read these. Pass them as props from the server `page.tsx` instead of adding `NEXT_PUBLIC_` vars. Example: `Footer` receives `apiUrl={process.env.API_URL}`.
