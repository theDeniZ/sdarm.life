# API reference

Hono Worker at `api.sdarm.life`. All routes versioned under `/api/v1`.

Source: `apps/api/src/routes/` (see [architecture.md](architecture.md)).

**Swagger UI:** `GET /api/ui` — interactive docs, available in local dev and production.
**OpenAPI spec:** `GET /api/openapi.json` — OpenAPI 3.1 JSON, auto-generated from route definitions.

## Public routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/posts` | Active posts. `?featured=1`, `?video=1`, `?limit=N`, `?offset=N`. Returns `{ items, total }`. |
| `GET` | `/api/v1/posts/:slug` | Single post by slug. 404 if deleted. |
| `GET` | `/api/v1/config` | All config as `{ key: value }` map (reads from Workers KV). |
| `GET` | `/api/v1/images/*` | Proxy-serves R2 objects by key path (local dev only). |
| `POST` | `/api/v1/subscribe` | Subscribe email. Body: `{ email, language? }` (`language` defaults to `'de'`). Sends a welcome email in the subscriber's language via Resend (background, non-blocking). 409 if already subscribed. |
| `GET` | `/api/v1/unsubscribe` | `?token=` — hard-deletes the subscriber row. Idempotent (404 if token not found). |
| `GET` | `/api/v1/songbooks` | All songbooks ordered by `sort_order`, each with `songCount`. |
| `GET` | `/api/v1/songbooks/:slug` | Songbook metadata + `songCount`. 404 if not found. |
| `GET` | `/api/v1/songbooks/:slug/songs` | Paginated song list. `?q=` searches number, title, and `song_parts.lyrics`. `?limit=N&offset=N`. Returns `{ items, total }`. When `?q=` is set, each item includes `matchType: 'title' \| 'number' \| 'lyrics'` indicating which field caused the match (used by the songbook UI to highlight title hits with `<mark>` and label lyrics-only hits with a small pill). |
| `GET` | `/api/v1/songs/search` | Global search across all songbooks. `?q=` (required, max 100 chars), `?limit=N&offset=N`. Returns `{ items, total }` of `SongSearchResultDto` (id, number, title, author, songbook). |
| `GET` | `/api/v1/songs/:id` | Full song with `parts` and `sheets` arrays. 404 if not found. |
| `GET` | `/api/v1/treasures` | Paginated treasure list. `?type=book`, `?language=de`, `?limit=N&offset=N`. Returns `{ items, total }`. |
| `GET` | `/api/v1/treasures/:id` | Single treasure by ID. 404 if not found. |
| `POST` | `/api/v1/book-request` | Submit a free-book delivery request. Body: `{ name, email, phone?, land (DE/AT/CH), street, plz, city, books[] (min 1), wish?, language? }`. Sends a formatted email to `info@sdarm.life` via Resend (background, non-blocking). Rate-limited: 2 requests per IP per minute. Returns `{ ok: true }` (201). |
| `GET` | `/api/v1/geocode` | Geocode proxy. `?q=` (1–100 chars, required), `?limit=N` (1–10, default 3). Forwards to Nominatim with the project User-Agent and caches the upstream JSON in KV for 30 days. Hides the user's IP from OpenStreetMap (DSGVO). Response: `X-Cache: HIT|MISS`; upstream errors return `[]` to keep the autocomplete resilient. |

## Admin routes

Require `Authorization: Bearer <key>` on every request.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/admin/posts/:id` | Single post by ID (for edit page). |
| `POST` | `/api/v1/admin/posts` | Create post. |
| `PATCH` | `/api/v1/admin/posts/:id` | Partial update (any field). |
| `DELETE` | `/api/v1/admin/posts/:id` | Soft-delete: sets `deleted_at = now()`. |
| `PUT` | `/api/v1/admin/config/:key` | Upsert config key in Workers KV. 400 if unknown key. |
| `GET` | `/api/v1/admin/images` | List images from D1 with usage info. `?limit=N&offset=N&unused=1`. Returns `{ items, total }`. |
| `DELETE` | `/api/v1/admin/images?key=` | Delete from R2 + D1. |
| `POST` | `/api/v1/admin/images/upload` | `multipart/form-data` → R2 + D1 → returns `{ key }`. |
| `POST` | `/api/v1/admin/images/backfill` | One-time: syncs all R2 objects into `images` table. Returns `{ synced }`. |
| `GET` | `/api/v1/admin/subscribers` | Active subscribers, newest first. `?limit=N&offset=N`. Returns `{ items, total }`. |
| `DELETE` | `/api/v1/admin/subscribers/:id` | Hard-delete subscriber. |
| `POST` | `/api/v1/admin/songbooks` | Create songbook. |
| `PATCH` | `/api/v1/admin/songbooks/:id` | Partial update. |
| `DELETE` | `/api/v1/admin/songbooks/:id` | Hard-delete songbook. |
| `GET` | `/api/v1/admin/songs/:id` | Song for edit (includes parts + sheets). |
| `POST` | `/api/v1/admin/songs` | Create song. Body: `{ songbookId, number, title, author?, copyright? }`. |
| `PATCH` | `/api/v1/admin/songs/:id` | Partial update (title, number, author, copyright). |
| `DELETE` | `/api/v1/admin/songs/:id` | Hard-delete song + all its parts and sheets (R2 keys deleted too). |
| `POST` | `/api/v1/admin/songs/:id/parts` | Add a part. Body: `{ type, label, sortOrder, lyrics, language?, translationType? }`. |
| `PATCH` | `/api/v1/admin/songs/:id/parts/:partId` | Partial update a part. Body: `{ type?, label?, sortOrder?, lyrics?, language?, translationType? }`. |
| `DELETE` | `/api/v1/admin/songs/:id/parts/:partId` | Delete a part. |
| `POST` | `/api/v1/admin/songs/:id/sheets/upload` | `multipart/form-data` (`file`, optional `type`). Accepts PDF and images (jpg, png, webp, gif). Stores under `sheets/{songId}/{uuid}.{ext}` in R2. |
| `DELETE` | `/api/v1/admin/songs/:id/sheets/:sheetId` | Delete sheet from D1 + R2. |
| `GET` | `/api/v1/admin/treasures` | All treasures (up to 500). Returns `{ items, total }`. |
| `POST` | `/api/v1/admin/treasures` | Create treasure. |
| `POST` | `/api/v1/admin/treasures/batch` | Bulk-create. Body: array of treasure objects. Returns `{ created: N }`. |
| `PATCH` | `/api/v1/admin/treasures/:id` | Partial update. |
| `DELETE` | `/api/v1/admin/treasures/:id` | Hard-delete treasure. |
| `GET` | `/api/v1/admin/api-keys` | List all API keys (active + revoked). |
| `POST` | `/api/v1/admin/api-keys` | Create key. Body: `{ name }`. Returns `{ key, apiKey }` — plaintext shown once. |
| `DELETE` | `/api/v1/admin/api-keys/:id` | Revoke key — removes from KV, marks revoked in index. |
| `POST` | `/api/v1/admin/email/send` | Send a single email. Body: `{ to, subject, html }`. Uses Resend. |
| `POST` | `/api/v1/admin/email/broadcast` | Bulk-send the updates email template to subscribers. Body: `{ subject, posts: [{ title, excerpt?, href }], locale? }`. `locale` omitted = send to all subscribers in their preferred language; `'de'`/`'en'` = filter to that language only. Sends via Resend batch API (100 per chunk). Returns `{ sent: N }`. |

**Image usage** — `GET /admin/images` cross-references `posts` (`cover_key`, `thumb_key`) and `site_config` to compute `usedIn` per image. Each item: `{ key, size, uploaded, usedIn: { type, label }[] }`. `?unused=1` filters to images not referenced in either table.

**CORS origins:** `https://sdarm.life`, `https://admin.sdarm.life`, `http://localhost:3000`, `http://localhost:3001`

## Rate limiting

IP-based rate limiting is applied on mutation endpoints to prevent spam. Implemented in `middleware/rate-limit.ts` — KV-backed, uses `CF-Connecting-IP` as the key, 1-minute sliding window.

| Endpoint | Limit |
|---|---|
| `POST /subscribe` | 3 requests / IP / minute |
| `POST /book-request` | 2 requests / IP / minute |

Returns `429` with `{ error: "Too many requests. Please try again later." }` when the limit is exceeded. KV read/write failures fail open (request is allowed through) to avoid breaking the endpoint.

## Auth model

Admin routes require `Authorization: Bearer <key>` on every request.

**Key verification (Worker middleware, `middleware/auth.ts`):**
1. SHA-256 hash the incoming key
2. Look up `apikey:{hash}` in Workers KV — if found, allow
3. Fallback: compare raw key to `env.API_KEY` (bootstrap env secret) — if matches, allow
4. Otherwise 401

**Key storage (KV):**
- Active key: `apikey:{sha256hex}` → `{ id, name, prefix }` — hot-path lookup, deleted on revoke
- Index: `apikeys:index` → JSON array of all keys (including revoked) — used by management UI

**Key management:** `GET/POST/DELETE /api/v1/admin/api-keys` — list, create (returns plaintext once), revoke. These routes are mounted outside the OpenAPI spec (no Swagger docs).

**Bootstrap:** `API_KEY` Worker secret + `API_KEY` admin Pages env var (server-only, same value). Synced via `sync-secrets` CI job. Local dev: both set to `dev` in `apps/api/.dev.vars` and `apps/admin/.env.local`. The admin browser bundle never sees `API_KEY` — calls go same-origin to `admin.sdarm.life/api/v1/*` and the [proxy route handler](../apps/admin/app/api/v1/%5B...path%5D/route.ts) attaches the bearer server-side.

## Response contract

All list endpoints return `{ items: T[], total: number }`. Never return a bare array.

All date fields are ISO strings (`string | null`) — Drizzle stores as integer seconds, Hono serializes on the way out. See [schema.md](schema.md) for Drizzle timestamp note.

Target DTO types live in `packages/types` (`@sdarm/types`) — see [architecture.md](architecture.md).

## API coding conventions

**All routes use `@hono/zod-openapi`.** Define routes with `createRoute()` + Zod schemas and register with `router.openapi()`. Never add undocumented routes with `router.get/post/...()` unless they are intentionally excluded from the spec (e.g. the local-dev R2 proxy). Shared response schemas live in `apps/api/src/schemas.ts`.

**Routes are versioned under `/api/v1`.** Admin routes live under `/api/v1/admin/*` — always verify auth before any mutation.

**Partial updates use `PATCH`.** Only set fields the caller explicitly provides.

**Soft-delete only for posts.** `DELETE /admin/posts/:id` sets `deleted_at`. Hard-delete is only used for subscribers and images.

**`notInArray(col, [])` is invalid Drizzle SQL.** When the input array is empty, skip the filter entirely — do not pass an empty array.

**`drizzle-orm` must be a direct dependency of `@sdarm/api`.** Wrangler bundles per-package and will not hoist it from `@sdarm/db`.

**`fetch().json<T>()`** is Cloudflare Workers-only. In Next.js always use `(await res.json()) as T`.

## Email infrastructure

Email is sent via **Resend** (`api.resend.com`) using the `RESEND_API_KEY` Worker secret. Sender address: `info@sdarm.life` (domain must be verified in Resend dashboard).

**Templates** live in `apps/api/src/emails/`:

| File | Function | Used by |
|---|---|---|
| `base.ts` | `baseLayout(content, { unsubscribeUrl, locale? })` | All templates — wraps content in header + footer |
| `welcome.ts` | `welcomeEmail({ unsubscribeUrl, locale? })` | Auto-sent on `POST /subscribe` |
| `updates.ts` | `updatesEmail(posts[], { unsubscribeUrl, locale? })` | `POST /admin/email/broadcast` |

All templates are bilingual (`'de'` / `'en'`). The unsubscribe link is always personalised with the subscriber's token (`/api/v1/unsubscribe?token=…`).

**`RESEND_API_KEY`** — set as a Wrangler secret in production (`wrangler secret put RESEND_API_KEY`). For local dev, add to `apps/api/.dev.vars`.

**Broadcast batching** — `/admin/email/broadcast` uses Resend's batch endpoint (`POST /emails/batch`) in chunks of 100. Each subscriber receives their own HTML with a personalised unsubscribe URL.

**Welcome email** fires via `c.executionCtx.waitUntil()` — non-blocking, does not affect the 201 response. Failures are silent (logged by Cloudflare observability).
