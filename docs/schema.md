# Database schema

Schema defined in `packages/db/src/index.ts` using Drizzle ORM. Shared across `apps/api` and `apps/admin`.

## Tables

**`posts`**
`id`, `title`, `slug` (unique), `excerpt`, `body`, `author`, `video_url`, `cover_key`, `cover_alt`, `thumb_key`, `is_featured` (boolean), `published_at`, `created_at`, `updated_at`, `deleted_at`

**`site_config`** *(deprecated — config now stored in Workers KV)*
`key` (PK), `value`, `updated_at`
- **No longer read or written by the application.** Config is stored as a single JSON object in Workers KV under the key `config`.
- The D1 table remains as a backup but is dormant. The Drizzle schema export (`siteConfig`) is kept to avoid a breaking change in `@sdarm/db`.

**`images`**
`key` (PK — R2 object key), `size` (bytes), `uploaded_at`
- Inserted on every upload (`POST /admin/images/upload`), deleted on every delete (`DELETE /admin/images`)
- D1 is the source of truth for image existence; R2 is just the blob store
- Direct R2 operations (wrangler, CF dashboard) bypass this table — manual backfill required

**`subscribers`**
`id`, `email` (unique), `token` (unique), `language` (default `'de'`), `unsubscribed_at`, `created_at`
- `language` — locale the subscriber was using when they signed up (`'de'` or `'en'`); used to send emails in their preferred language
- Unsubscribing hard-deletes the row (`DELETE`); there are no soft-deleted subscribers

**`songbooks`**
`id`, `title`, `slug` (unique), `language` (default `'ru'`), `description`, `cover_key`, `sort_order`, `created_at`, `updated_at`

**`songs`**
`id`, `songbook_id` (FK → `songbooks.id`), `number`, `title`, `author`, `copyright`, `created_at`, `updated_at`

**`song_parts`**
`id`, `song_id` (FK → `songs.id`), `type` (`verse` | `chorus` | `bridge` | `intro` | `outro` | `coda`), `label`, `sort_order`, `lyrics`
- `lyrics` is plain text; chord annotations are embedded inline (e.g. `[G]Amazing [C]grace`)

**`song_sheets`**
`id`, `song_id` (FK → `songs.id`), `key` (R2 object key under `sheets/{songId}/{uuid}.{ext}`), `type` (`pdf` | `image`), `sort_order`, `uploaded_at`
- Stored in the same R2 bucket (`IMAGES` binding) as post cover images
- Deleted from R2 on `DELETE /admin/songs/:id/sheets/:sheetId`

**`treasures`**
`id`, `title`, `author`, `description`, `type` (`book`), `language`, `cover_gradient`, `cover_accent_color`, `cover_key`, `is_free` (boolean), `price`, `sort_order`, `epub_url`, `epub_key`, `created_at`, `updated_at`
- `type` is an enum; only `'book'` for now — new types with additional metadata can be added later
- `cover_gradient` / `cover_accent_color` — optional CSS gradient/color used to render a synthetic 3-D book cover when no image is available
- `cover_key` — optional R2 object key for a real cover image
- `epub_url` — direct URL to an EPUB file (external, e.g. `media2.egwwritings.org`)
- `epub_key` — optional R2 object key for a self-hosted EPUB, under a `books/` prefix. Same relationship to the EPUB file as `cover_key` has to the cover image. When set, it wins over `epub_url` (see [api.md](api.md)) — self-hosted, CORS-safe, no external data transfer
- Bulk-import from `scripts/epub-meta.json` via `POST /admin/treasures/batch`

## `sdarm-bible` — the second database

Bible verses live in a **separate D1**, `sdarm-bible`, bound as `BIBLE_DB`.
Schema: `packages/db/src/bible.ts`. Migrations: `packages/db/migrations-bible/`,
generated with `pnpm --filter @sdarm/db generate:bible`.

It is separate for two reasons. It is created with `--location=weur` so the rows
sit in the EU — a copyright posture, not a GDPR one (see
[dsgvo.md](dsgvo.md)) — and `--location` cannot be changed after creation, so it
could not have been retrofitted onto `sdarm-db`. And it keeps ~31k verse rows per
translation out of the database the CMS runs on.

**`bible.ts` is deliberately not re-exported from `src/index.ts`.** `pnpm generate`
diffs that file into `../migrations` for `sdarm-db`; a re-export would emit the
Bible tables into the wrong database's migrations. Import them as `@sdarm/db/bible`.

**`BIBLE_DB` is an optional binding.** An environment without it serves zero
locally-hosted translations instead of throwing — which is what lets local and
staging run the feature while production still goes through YouVersion.

**`bible_translations`**
`id` (PK — prefixed: `loc:luther1912`, `yv:51`), `source` (`local` | `youversion`), `slug` (unique), `name`, `abbreviation`, `language`, `year`, `lxx_psalms`, `sort_order`, `license_basis` (`public-domain` | `permission` | `provider`), `rights_holder`, `notice`, `provenance`, `permission_ref`, `permission_date`, `allow_download`, `allow_offline`, `allow_search_index`, `allow_projector`, `max_verses_per_request`, `verse_count`, `book_count`, `ingested_at`, `bundle_key`, `created_at`, `updated_at`
- One row per translation the operator has ever configured, **both sources**. A YouVersion row holds no verses; it exists so its license record and gates are editable like any other translation's.
- Presence here is not visibility. The KV allowlist (`bible_translations` config key) decides what the public routes serve.
- `lxx_psalms` is computed at ingest from the verse data itself (176 verses at Psalm 118), never taken on trust from the source file.

**`bible_books`**
`id`, `translation_id` (FK), `code` (USFM), `number` (1–66), `name` (localized), `abbreviation`, `testament` (`OT` | `NT`), `chapter_count`
- Written by the ingest script. The source JSON carries neither book names nor chapter counts: names come from a static per-language table in `scripts/bible/`, counts are derived from the verses.
- `number` is the canonical Protestant order for every translation, so the OT/NT tabs are stable across languages. The Synodal text's own running order (Acts, catholic epistles, then Paul) is a presentation of the same 66 books and is not preserved.

**`bible_verses`**
`id`, `translation_id` (FK), `book` (USFM), `chapter`, `verse`, `text`
- ~31k rows per translation; a chapter read is ~30 rows off the covering index.

**`bible_verses_fts`** — FTS5 virtual table, `migrations-bible/0001_bible_fts.sql`
- Hand-written: drizzle-kit cannot express a virtual table, so that file is not produced by `generate:bible` and must not be regenerated. A later `generate:bible` will not touch it — drizzle diffs against its own snapshot in `meta/`, which knows nothing about this table.
- Standalone rather than `content='bible_verses'`: rows are written once by a bulk ingest and never edited individually, so external-content triggers buy nothing and slow the import. The ingest writes both tables.
- Tokenizer `unicode61 remove_diacritics 2` — readers type "Grusse" far more often than "Grüße".
- The ingest **omits** a translation whose `allow_search_index` is false. That gate is enforced in the index itself, not only at the route.

### Ingesting a translation

Source JSON lives in `bible-data/` (untracked — it carries its own `.gitignore`).
`scripts/bible/ingest.ts` maps it to USFM, derives the book table, and emits
chunked SQL under `scripts/bible/out/` for `wrangler d1 execute`. Adding a Bible
is: run the script, apply the chunks, enable the id. It is deliberately **not**
an admin upload UI. See `scripts/bible/README.md` for the local → staging →
production runbook.

## Config keys

`KNOWN_CONFIG_KEYS` is exported from `@sdarm/db` and is the single source of truth. Both `apps/api` and `apps/admin` import it — never hardcode config keys elsewhere.

```
donation_url
hero_bg_key, hero_bg_alt
about_text_1, about_text_2, about_image_key, about_image_alt, about_link_url
facebook_url, whatsapp_url, instagram_url, youtube_url
bible_translations
home_grid
```

`bible_translations` is an **ordered JSON array of prefixed translation ids** —
`"[\"loc:luther1912\",\"yv:51\"]"` — written by Admin → Bible and read by the
public `/bible/*` routes. The prefix names the source, so a self-hosted text and a
YouVersion one can never collide on an id; a bare number from a pre-self-hosting
allowlist is still read as `yv:{n}`. Verse text for `loc:` translations lives in
[`sdarm-bible`](#sdarm-bible--the-second-database); for `yv:` translations
**nothing is stored** — see [api.md](api.md#bible-content).

**`home_grid` is the one key that holds a document, not a scalar.** Its value is
`JSON.stringify(HomeGridConfig)` — the five homepage bento blocks with roughly a
dozen settings each in two languages, about a hundred values. Flat keys cannot
carry that. Read it with `parseGridConfig()` from `@sdarm/types`, which merges
whatever is stored onto the defaults and tolerates missing or malformed fields
rather than throwing: a bad value in KV must not be able to blank the homepage.
The generic admin Config page excludes this key; it is edited at `/home-grid`.

## Drizzle notes

- `mode: 'timestamp'` stores dates as integer seconds in SQLite; Hono serializes them to ISO strings on the way out
- All date fields arriving from the API are `string | null` — never `number`
- `@sdarm/db` exports schema tables + `KNOWN_CONFIG_KEYS` + `ConfigKey` type only — no runtime logic

## Migrations

Migration files live in `packages/db/migrations/` as numbered SQL files. They are applied by Wrangler.

**Never edit existing migration files.** To change the schema:
1. Edit `packages/db/src/index.ts`
2. Run `cd packages/db && pnpm generate` to produce a new numbered SQL file
3. Apply locally: `./apps/api/node_modules/.bin/wrangler d1 migrations apply sdarm-db --config apps/api/wrangler.jsonc`
4. Commit both the schema change and the migration file
5. Push to `main` — CI applies to production automatically before deploying the Worker

**Never use `drizzle-kit push`** — it bypasses migration files and is not tracked.

Remote migrations run via `.github/workflows/ci.yml` on every push to `main`. Wrangler tracks applied migrations and skips already-run files — safe to run on every push.

### `sdarm-bible` migrations

The second database has its own schema file, its own migrations directory and its
own apply command. Everything above applies, with three substitutions:

1. Edit `packages/db/src/bible.ts` (**not** `index.ts` — see [gotchas.md](gotchas.md#second-d1-sdarm-bible))
2. `cd packages/db && pnpm generate:bible` → a new file in `migrations-bible/`
3. Apply: `./apps/api/node_modules/.bin/wrangler d1 migrations apply sdarm-bible --config apps/api/wrangler.jsonc` (add `--env staging --remote` for staging, `--remote` for production)

⚠️ **CI does not apply these yet.** The steps exist in `ci.yml` and
`deploy-production.yml` but are commented out, because the database ids in
`apps/api/wrangler.jsonc` are still placeholders. Enable each step in the same
commit that pastes the corresponding id. Order is local → staging → production.
