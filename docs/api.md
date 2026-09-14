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
| `GET` | `/api/v1/songs/:id` | Full song with `parts` and `sheets` arrays; `songbook` includes `language` (drives the projector's chorus/Amen slide labels). 404 if not found. |
| `GET` | `/api/v1/treasures` | Paginated treasure list. `?type=book`, `?language=de`, `?limit=N&offset=N`. Returns `{ items, total }`. |
| `GET` | `/api/v1/treasures/:id` | Single treasure by ID. 404 if not found. |
| `GET` | `/api/v1/bible/translations` | Translations the operator enabled in Admin → Bible, in the configured order. Empty array when none are configured. Each item's `id` is a prefixed string (`loc:luther1912`, `yv:51`) and carries a `license` object (see below). |
| `GET` | `/api/v1/bible/translations/:code` | Translation metadata. `:code` is the URL slug, the prefixed id, or (YouVersion only) the raw numeric ID. 404 if unknown or not enabled. |
| `GET` | `/api/v1/bible/translations/:code/books` | Books in canonical order with localized names and chapter counts. 404 if unknown/not enabled. |
| `GET` | `/api/v1/bible/translations/:code/books/:bookCode` | Single book metadata (USFM code, e.g. `JHN`). 404 if not found. |
| `GET` | `/api/v1/bible/translations/:code/books/:bookCode/chapters/:n` | Chapter with all verses. `truncated: true` when `license.maxVersesPerRequest` cut it short. 404 if translation/book/chapter not found. |
| `GET` | `/api/v1/bible/parallel` | `?a=&b=&book=&chapter=` — two translations side-by-side, aligned by verse number. Psalm chapters are remapped between LXX and Hebrew numbering (see below). 400 if `a === b`, 404 if anything is missing. |
| `GET` | `/api/v1/bible/search` | `?q=` (required, 2–100 chars), `?translation=` (code, prefixed id, or numeric id — restricts to one), `?book=` (USFM code), `?limit=N&offset=N`. Searches only locally-hosted translations with `license.allowSearchIndex` set. Returns `{ items, total }` of `BibleSearchHitDto`. 400 if `q` is out of range, 404 if `translation` doesn't resolve, **403** (not 404) if it resolves but isn't indexable. |
| `GET` | `/api/v1/bible/translations/:code/bundle` | Offline bundle manifest — `{ translationId, code, name, language, verseCount, bookCount, key, license }`. `key` is the R2 object key of the generated bundle (see caveat below — no bucket binding actually serves it yet). 403 if `license.allowOffline` or `license.allowDownload` is false, 404 if the translation doesn't resolve or no bundle has been generated. |
| `POST` | `/api/v1/book-request` | Submit a free-book delivery request. Body: `{ name, email, phone?, land (DE/AT/CH), street, plz, city, books[] (min 1), wish?, language? }`. Sends a formatted email to `info@sdarm.life` via Resend (background, non-blocking). Rate-limited: 2 requests per IP per minute. Returns `{ ok: true }` (201). |
| `GET` | `/api/v1/geocode` | Geocode proxy. `?q=` (1–100 chars, required), `?limit=N` (1–10, default 3). Forwards to Nominatim with the project User-Agent and caches the upstream JSON in KV for 30 days. Hides the user's IP from OpenStreetMap (DSGVO). Response: `X-Cache: HIT|MISS`; upstream errors return `[]` to keep the autocomplete resilient. |
| `GET` | `/api/v1/og` | Generated OpenGraph social card (1200×630 PNG). `?type=post\|song\|treasure`, `?slug=` (post) or `?id=` (song/treasure), `?locale=de\|en`, optional `?v=` (content `updatedAt`, makes the URL self-busting). Rendered with `workers-og` (Satori + resvg-wasm), self-hosted Lexend + Noto-Sans-Cyrillic fonts (DSGVO-clean, no external fetch). KV-cached 24 h (`X-Cache: HIT\|MISS`) + `Cache-Control: public, max-age=3600`. Cover fetched from the R2 binding and embedded. Binary responder — excluded from the OpenAPI spec, like the local-dev R2 proxy. 400 on missing/invalid params, 404 if the content doesn't exist. |

**`epubKey` wins over `epubUrl`.** A treasure carries both fields (see [schema.md](schema.md)); when `epubKey` is set, `apps/treasures` resolves the reader URL via `r2url(epubKey)` (self-hosted, on `images.sdarm.life`) and ignores `epubUrl`. When `epubKey` is null, `epubUrl` is used as-is (external host, e.g. `media2.egwwritings.org`). This lets self-hosted books coexist with the ~49 existing rows that still point at the external host without touching them.

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
| `POST` | `/api/v1/admin/songs/:id/parts` | Add a part. Body: `{ type, label, sortOrder, lyrics }`. |
| `PATCH` | `/api/v1/admin/songs/:id/parts/:partId` | Partial update a part. |
| `DELETE` | `/api/v1/admin/songs/:id/parts/:partId` | Delete a part. |
| `POST` | `/api/v1/admin/songs/:id/sheets/upload` | `multipart/form-data` (`file`, optional `type`). Accepts PDF and images (jpg, png, webp, gif). Stores under `sheets/{songId}/{uuid}.{ext}` in R2. |
| `DELETE` | `/api/v1/admin/songs/:id/sheets/:sheetId` | Delete sheet from D1 + R2. |
| `GET` | `/api/v1/admin/treasures` | All treasures (up to 500). Returns `{ items, total }`. |
| `POST` | `/api/v1/admin/treasures` | Create treasure. |
| `POST` | `/api/v1/admin/treasures/batch` | Bulk-create. Body: array of treasure objects. Returns `{ created: N }`. |
| `PATCH` | `/api/v1/admin/treasures/:id` | Partial update. |
| `DELETE` | `/api/v1/admin/treasures/:id` | Hard-delete treasure. |
| `POST` | `/api/v1/admin/treasures/epub/upload` | `multipart/form-data` (`file`) → validates extension is `.epub` → stores at `books/{uuid}.epub` in R2 (`IMAGES` binding) → returns `{ key }`. Does **not** insert into the `images` D1 table — that table drives Image Library usage-tracking against posts/config, and an EPUB isn't part of that domain. 400 if the file isn't an EPUB. |
| `GET` | `/api/v1/admin/api-keys` | List all API keys (active + revoked). |
| `POST` | `/api/v1/admin/api-keys` | Create key. Body: `{ name }`. Returns `{ key, apiKey }` — plaintext shown once. |
| `DELETE` | `/api/v1/admin/api-keys/:id` | Revoke key — removes from KV, marks revoked in index. |
| `POST` | `/api/v1/admin/email/send` | Send a single email. Body: `{ to, subject, html }`. Uses Resend. |
| `GET` | `/api/v1/admin/bible/catalog` | One page of the YouVersion catalog for the Admin → Bible picker. `?language=deu\|eng\|rus\|…\|all`, `?pageToken=`, `?allAvailable=true` (include Bibles our key holds no license for, flagged `licensed: false`). Returns `{ items, total, nextPageToken }`. 503 when `YOUVERSION_API_KEY` is unset or YouVersion is unreachable. |
| `GET` | `/api/v1/admin/bible/licenses` | Licenses available to the app key, each with the Bible IDs it governs. `?bibleId=N` narrows to the one covering that Bible. Reference data only — **acceptance state is deliberately not exposed** (see below). 503 when unset/unreachable. |
| `GET` | `/api/v1/admin/bible/translations` | Every row in `sdarm-bible`'s `bible_translations`, both sources, as `BibleAdminTranslationDto` — license, gates, ingest status, plus `enabled` (derived live from the KV allowlist, never stored). Empty array when `BIBLE_DB` is unbound. |
| `POST` | `/api/v1/admin/bible/translations` | Create the D1 record for a YouVersion translation that has none yet. Body: `{ id (yv:N), slug, name, abbreviation, language, year?, lxxPsalms? }`. Gets the restrictive provider defaults (`allowDownload/allowOffline/allowSearchIndex: false`). Local translations get their record from the ingest script, not this route. 409 if the id already has a record, 503 if `BIBLE_DB` is unbound. |
| `PATCH` | `/api/v1/admin/bible/translations/:id` | Partial update of identity, license record, and gates. `:id` is url-encoded (`loc%3Aluther1912`). Body: any of `name, slug, abbreviation, language, year, lxxPsalms, sortOrder, licenseBasis, rightsHolder, notice, provenance, permissionRef, permissionDate, allowDownload, allowOffline, allowSearchIndex, allowProjector, maxVersesPerRequest`. 404 if no record exists for `:id`, 503 if `BIBLE_DB` is unbound. |
| `PUT` | `/api/v1/admin/bible/allowlist` | Replace the KV allowlist wholesale. Body: `{ ids: string[] }`, ordered. Writes the same `bible_translations` field that `PUT /admin/config/bible_translations` writes — a dedicated, validated entry point onto the same field, not a second store. 400 if any id fails to parse. |
| `POST` | `/api/v1/admin/bible/takedown` | "Remove now": drop one translation from the allowlist, **bump the Bible cache generation** (stranding every cached chapter/parallel response) and purge the enumerable books index. Body: `{ id }`. Effective within ~1 minute — see [Takedown latency](#takedown-latency). Does not reach `apps/treasures`' own Next Data Cache or a copy a reader already downloaded. |
| `POST` | `/api/v1/admin/email/broadcast` | Bulk-send the updates email template to subscribers. Body: `{ subject, posts: [{ title, excerpt?, href }], locale? }`. `locale` omitted = send to all subscribers in their preferred language; `'de'`/`'en'` = filter to that language only. Sends via Resend batch API (100 per chunk). Returns `{ sent: N }`. |

**Image usage** — `GET /admin/images` cross-references `posts` (`cover_key`, `thumb_key`) and `site_config` to compute `usedIn` per image. Each item: `{ key, size, uploaded, usedIn: { type, label }[] }`. `?unused=1` filters to images not referenced in either table.

**CORS origins** (`apps/api/src/index.ts` is the source of truth — this list drifted once and read as though `treasures.sdarm.life` were missing):
`https://sdarm.life`, `https://admin.sdarm.life`, `https://songs.sdarm.life`, `https://events.sdarm.life`, `https://treasures.sdarm.life`, the five `sdarm-*-staging.mine-a8f.workers.dev` Workers, and `http://localhost:3000`–`3004`.

## Bible content

Bible text comes from **two sources** behind one API contract, resolved by `apps/api/src/services/bible/catalog.ts` from the prefix of a translation's id:

| Source | id prefix | Where the verses live | Persisted state |
|---|---|---|---|
| Locally-hosted, public-domain texts | `loc:` (e.g. `loc:luther1912`) | `sdarm-bible` — a **second** D1 database, bound as `BIBLE_DB` (optional binding; an environment without it serves zero local translations) | Verses, books, and the per-translation license record, in `bible_translations` / `bible_books` / `bible_verses` (see [schema.md](schema.md)) |
| YouVersion Platform API (`api.youversion.com/v1`) | `yv:` (e.g. `yv:51`) | Proxied entirely server-side by `apps/api/src/services/bible/youversion.ts` | Nothing — fetched live, KV-cached |

The operator-curated allowlist (KV config key `bible_translations`) is an ordered JSON array of these prefixed ids — this is what decides which translations, from either source, the public routes actually serve. A bare number in an old allowlist (`51`) still parses as `yv:51`.

| Layer | What it holds |
|---|---|
| KV config key `bible_translations` | Ordered JSON array of prefixed translation ids — the allowlist |
| `sdarm-bible` (`BIBLE_DB`) | Verse rows, book metadata, and the license record for every configured translation (both sources — a YouVersion translation may have a row here purely so its license/gates are editable) |
| KV `bible:*` | Cached YouVersion responses only: catalog 1 d, Bible metadata 1 d, books 7 d, chapters 30 d |
| Edge cache | books / chapters / parallel for 1 day, applied **per route** via `cached()` — the translation, search, and bundle endpoints are deliberately uncached (see below) |

**Service layer** (`apps/api/src/services/bible/`):

- `youversion.ts` — the HTTP client. Auth header is `X-YVP-App-Key`; `page_size` must be **< 100** (the API rejects 100). Chapters are requested with `format=html` because `format=text` drops verse boundaries, then parsed on the `<span class="yv-v" v="N">` markers.
- `local.ts` — the local provider. Every function takes `env` and returns empty/null when `BIBLE_DB` is unbound rather than throwing — this is what lets local and staging run the feature while production still goes through YouVersion alone.
- `cache.ts` — KV read-through helpers and TTLs for the YouVersion side. Failures are silent and never break a request.
- `catalog.ts` — the single entry point the routes call. Resolves the enabled-id list into translations from either source, applies the per-translation verse cap, and does the local full-text search.

**Repository** (`apps/api/src/repositories/bible.ts`) holds all queries against `sdarm-bible`, including the raw-SQL full-text search over the hand-written `bible_verses_fts` virtual table (drizzle has no schema object for FTS5).

**Translation identity.** A local translation's slug is chosen at ingest; a YouVersion translation's slug is its Latin `abbreviation`, lowercased (`delut`, `nrt`) — the localized abbreviation is *display*-only, since it can be non-Latin (`НРП`) and would sanitise to nothing. Routes accept the slug, the prefixed id, or (YouVersion only) the raw numeric ID, so links survive an abbreviation change upstream.

### Gates — where each one is enforced

Every translation carries a `license` object (`BibleLicenseDto`) with a `basis` (`public-domain` / `permission` / `provider`) and five gates. All six public-domain texts ingested so far get the permissive set; a YouVersion translation with no D1 row gets the restrictive provider defaults (`allowDownload/allowOffline/allowSearchIndex: false`, `allowProjector: true`).

| Gate | Enforced |
|---|---|
| `allowSearchIndex` | API: `GET /bible/search` 403s a named translation that isn't indexable; the search itself only ever runs over local translations with the flag set — a YouVersion translation can never appear in results even unnamed. |
| `allowDownload` + `allowOffline` | API: `GET /bible/translations/:code/bundle` 403s unless both are true. |
| `maxVersesPerRequest` | API: `catalog.ts` truncates chapter and parallel responses to the cap and sets `truncated: true`. Public-domain texts carry no cap (`null`). |
| `allowProjector` | **UI only** (`apps/treasures`), hiding the projector/presenter entry points. There is no API-level check: the projector reads the same chapter route as the reader, so enforcing this server-side would mean trusting a client-supplied "I am a projector" flag, which is not enforcement. |

**Editing a license record or gate** goes through `PATCH /admin/bible/translations/:id` — never a raw D1 write. Enabling/disabling a translation for the public goes through `PUT /admin/bible/allowlist` (or the plain `PUT /admin/config/bible_translations`, which is the same field).

**Psalm numbering** is detected, not hardcoded: Psalm 119 is the 176-verse acrostic under Hebrew numbering but sits at 118 under the Septuagint, so `detectLxxPsalms()` reads the verse count of PSA.118 from the books payload. The resulting `lxxPsalms` flag drives the chapter remap in parallel mode (verified against DELUT/ASV/NIV vs NRT/CARS).

**License acceptance is not observable.** `GET /v1/licenses` returns `agreed_dt` and `yvp_user_id` on every row, but under app-key auth **both are always `null`** — even when every license has been accepted in the YouVersion developer dashboard (verified live 2026-07-25: all 9 available licenses reported `agreed_dt: null` while their Bibles fetched fine). They are user-scoped fields that only a "Sign in with YouVersion" token would populate, and that flow is forbidden by [dsgvo.md](dsgvo.md). Never derive an "accepted" badge from them.

The signal that *does* work is the default `/v1/bibles` listing: it returns only Bibles the key may read. That is what `listLicensedIds()` crawls and what the catalog's `licensed` flag reports. A Bible absent from it returns **403** on a passage fetch, versus 404 for one that does not exist at all.

**Failure behaviour.** A YouVersion translation has no D1 fallback for its text, so an unreachable YouVersion or missing key yields 404 (public) / 503 (admin catalog) for that translation only; a `loc:` translation is unaffected, since its verses are a normal D1 read. Either way the reader renders its `BibleUnavailable` state on a 404. When no translations are enabled, `/bible/translations` returns an empty list and the landing page says so.

**Enabling a translation** writes the ordered id array through `PUT /admin/config/bible_translations` or the dedicated `PUT /admin/bible/allowlist` — the same field either way. The translation endpoints are uncached at the edge precisely so an allowlist change shows up immediately; `PUT /admin/bible/allowlist` additionally bumps the cache generation, so the text routes follow within a minute. The generic config route does not, so **prefer the dedicated route** when disabling something.

### Takedown latency

Bible text routes (books / chapters / parallel) are edge-cached for a day, and
their URLs cannot be purged by URL: there are ~1,189 chapters per translation
plus every parallel pairing. They are keyed by a **cache generation** instead — a
token in KV folded into the cache key (`middleware/cache.ts`, `services/bible/cache.ts`).
Bumping it makes every stored entry unreachable at once, without touching any of them.

The generation is bumped by `POST /admin/bible/takedown`, `PUT /admin/bible/allowlist`,
and `PATCH /admin/bible/translations/:id` — the last because the license object is
embedded in every chapter response, so editing a notice or a gate changes all of them.

⚠️ **The bound is about a minute, not instant.** Each isolate memoises the
generation for 60 s so an edge hit costs no KV read; an isolate holding the old
token keeps serving the old entries until its memo expires. **One minute is the
figure to quote a rights holder** — verify it still holds before signing anything
that promises faster. Two things remain out of reach either way: `apps/treasures`
holds its own Next Data Cache window on top, and a copy already on a reader's
device is gone from our control entirely.

## LLM / agent endpoints

Plain-text Markdown routes for AI answering agents (ChatGPT, Claude, Gemini, Perplexity) to read our public content without crawling the full HTML site. Source: `apps/api/src/routes/llm.ts`, formatting helpers in `apps/api/src/services/llm/markdown.ts`. All responses are `Content-Type: text/markdown; charset=utf-8`. Mounted at `/api/v1/llm` and, deliberately outside `/api/v1`, excluded from the OpenAPI spec — same reasoning as `routes/og.ts`: these return Markdown, not a JSON contract for `@hono/zod-openapi` to validate.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/llm` | Index — a short description of sdarm.life plus a link list to every route below, and a note that the Sabbath Bible Lesson quarterlies are static JSON at `https://sbl.sdarm.life/data/index.json` (keys like `de-2026-3`, quarter file at `.../data/{lang}/{key}.json`). Also served at the Worker root, `GET /llms.txt` — identical content. Does not touch D1. |
| `GET` | `/api/v1/llm/site` | `?lang=de\|en` (default `de`, invalid → `de`). About text (KV config `about_text_1`/`about_text_2` if set, else the i18n fallback), the 25 points of faith, and contact info (email + social URLs from config). |
| `GET` | `/api/v1/llm/posts` | Latest 50 active posts — title, date, author, excerpt, site link, link to the Markdown detail. |
| `GET` | `/api/v1/llm/posts/:slug` | Full post body. 404 text if missing or soft-deleted. |
| `GET` | `/api/v1/llm/songbooks` | All songbooks — title, language, description, song count, link to the Markdown detail. |
| `GET` | `/api/v1/llm/songbooks/:slug` | The **whole songbook** in one response — every song ordered by number, with author, copyright (rendered whenever set — all songs are exposed with their copyright, by product decision), and every part's lyrics with chord annotations (`[G]`) stripped. Two queries total (songs of the book, then their parts via a join on `songbookId` — not `inArray` on song ids, which a 700+-song book overflows past D1's bound-variable cap). |
| `GET` | `/api/v1/llm/songs/:id` | A single song, same format as above. |
| `GET` | `/api/v1/llm/treasures` | Book catalogue — title, author, language, free/price, description, site link. |
| `GET` | `/api/v1/llm/bible` | Only locally-hosted (`loc:`) translations that are both enabled in the allowlist and have `license.allowDownload` true — YouVersion (`yv:`) text is never exposed here, by product decision. Name, abbreviation, language, year, license basis, verbatim notice, link to the Markdown book list. |
| `GET` | `/api/v1/llm/bible/:code` | Book list (canonical order, localized name, USFM code, chapter count) with links. `:code` resolves like the public Bible routes. `yv:`/unknown/not enabled → 404; `loc:` but `allowDownload` false → 403. |
| `GET` | `/api/v1/llm/bible/:code/:book` | The **whole book** in one response — header with translation name + verbatim license notice, then `## {BookName} {chapter}` per chapter and one `{verse} {text}` line per verse, notice repeated at the end. One query (`repositories/bible.ts#listBookVerses`, ordered by chapter/verse). Honours `license.maxVersesPerRequest`, truncating and saying so. Same gating as the book-list route. |

**Caching:** the index (`/llm` and `/llms.txt`) is cached 1 day; `/llm/site`, `/llm/posts[/:slug]`, `/llm/songbooks[/:slug]`, `/llm/songs/:id`, and `/llm/treasures` are cached 1 hour (`cached(3600)`). `/llm/bible/:code` and `/llm/bible/:code/:book` use the same generation-keyed edge cache as `routes/bible.ts` (1 day, stranded immediately by a takedown or license edit). `/llm/bible` (the translation index) is deliberately left uncached, like `/bible/translations`, since it reflects the admin allowlist and the `allowDownload` gate.

**`robots.txt`** (`GET /robots.txt`, plain text, cached 1 day, source `routes/robots.ts`): the default `*` group sets `Content-Signal: search=yes, ai-input=yes, ai-train=no` and disallows everything (this is where general AI-training crawlers land). A named group for the AI answer-engine user agents (`ChatGPT-User`, `OAI-SearchBot`, `Claude-User`, `Claude-SearchBot`, `Perplexity-User`, `PerplexityBot`, `MistralAI-User`, `DuckAssistBot`) allows only `/llms.txt` and `/api/v1/llm`, disallowing everything else.

## Rate limiting

IP-based rate limiting is applied on mutation endpoints to prevent spam. Implemented in `middleware/rate-limit.ts` — KV-backed, uses `CF-Connecting-IP` as the key, 1-minute sliding window.

| Endpoint | Limit |
|---|---|
| `POST /subscribe` | 3 requests / IP / minute |
| `POST /book-request` | 2 requests / IP / minute |

Returns `429` with `{ error: "Too many requests. Please try again later." }` when the limit is exceeded. KV read/write failures fail open (request is allowed through) to avoid breaking the endpoint.

**`/api/v1/llm`, `/api/v1/llm/*`, and `/llms.txt`** use a separate limiter — `middleware/llm-rate-limit.ts`, backed by the Workers **Rate Limiting binding** (`LLM_RATE_LIMITER` in `wrangler.jsonc`, 60 requests/IP/minute), not the KV-backed helper above. AI crawlers are frequent enough that KV writes on every request would burn a meaningful share of the free plan's 1,000 KV writes/day (see docs/gotchas.md) for traffic that is otherwise a plain cached read; the Rate Limiting binding counts inside the Workers runtime and costs no KV write. Applied before the cache middleware, so an over-limit request is never given a cache write either. Returns `429` with a `text/plain` body and `Retry-After: 60`. The binding is optional (`LLM_RATE_LIMITER?: RateLimit`) — an environment without it (e.g. local dev, where the binding is not simulated) serves these routes unrestricted rather than failing. Not applied to the existing `/bible/*` routes — `apps/treasures`' server fetches those from shared Cloudflare IPs and would be rate-limited alongside real visitors.

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
