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
`id`, `email` (unique), `token` (unique), `unsubscribed_at`, `created_at`

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

## Config keys

`KNOWN_CONFIG_KEYS` is exported from `@sdarm/db` and is the single source of truth. Both `apps/api` and `apps/admin` import it — never hardcode config keys elsewhere.

```
donation_url
hero_bg_key, hero_bg_alt
about_text_1, about_text_2, about_image_key, about_image_alt, about_link_url
facebook_url, whatsapp_url, instagram_url, youtube_url
```

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
