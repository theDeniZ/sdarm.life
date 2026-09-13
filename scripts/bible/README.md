# Bible ingest — operator runbook

Turns the six public-domain texts in `bible-data/` into the rows `sdarm-bible`
serves. Two things live in this folder as data, not code, and are both
gitignored:

- `bible-data/*.json` — the source texts (repo-root, not under `scripts/`)
- `scripts/bible/out/` — the generated SQL chunks

Neither is reproducible from the rest of the repo — keep your own copy of
`bible-data/` alongside this checkout.

This document is ordered **local → staging → production**, because that is the
order to actually do the work in: verify the ingest and the schema locally
first, prove it on staging, then touch production last.

## 0. One-time: generate the SQL chunks

```bash
npx tsx scripts/bible/ingest.ts
```

Run from the repo root. This reads all six `bible-data/*.json` files and
writes `scripts/bible/out/<slug>/*.sql` — it never touches a database. Expect:

```
luther1912        31171 verses, 66 books, lxxPsalms=false
elberfelder1905   31102 verses, 66 books, lxxPsalms=false
schlachter1905    31170 verses, 66 books, lxxPsalms=false
kjv               31102 verses, 66 books, lxxPsalms=false
rv1909            31084 verses, 66 books, lxxPsalms=false
synodal           31349 verses, 66 books, lxxPsalms=true
```

If any book code in a source file isn't in `scripts/bible/usfm.ts`, the script
throws immediately naming the code — it never silently drops a book. Add the
mapping and re-run.

Each translation's output directory applies in filename order
(`00-delete.sql`, `01-translation.sql`, `02-books.sql`, then the per-book
`03-verses-NN-XXX.sql` and `04-fts-NN-XXX.sql` files, 66 of each): the delete
step clears any prior rows for that translation first, so applying a
directory twice is safe.

## 1. Local

The local D1 binding (`BIBLE_DB` → `sdarm-bible`) is already declared in
`apps/api/wrangler.jsonc` — local dev needs no database creation step, D1
state is just a local SQLite file keyed by database name.

Apply the schema, then the data:

```bash
# Schema
./apps/api/node_modules/.bin/wrangler d1 migrations apply sdarm-bible --config apps/api/wrangler.jsonc

# Data — one translation, or all six when no slug is given
scripts/bible/apply.sh local luther1912
scripts/bible/apply.sh local
```

`apply.sh` concatenates each translation's chunks instead of applying the 135
files on disk one at a time. **Do not loop `wrangler d1 execute` over those
files** — it spends about eight minutes per translation in wrangler start-up
alone, against roughly ten seconds concatenated (measured: all six locally in
93 s). The chunk filenames already sort into apply order, so concatenating in
filename order preserves it. Reach for the per-file form only when one chunk is
failing and you want to see which.

⚠️ **Remote applies are split into ~2 MB parts; local stays one file.** A remote
apply is a D1 *import*: wrangler uploads the file, the server executes it, and
wrangler polls for progress — cancelling everything if a poll takes longer than
15 s. The 14 MB Synodal file hit exactly that (`Cancelled due to no poll()
received in 15000ms`, after 276 of ~290 statements). Parts keep each server-side
step inside the poll window. Local applies go straight at a SQLite file with no
import protocol, so they stay whole. If a slow link still trips the timeout,
lower it: `BIBLE_PART_BYTES=1000000 scripts/bible/apply.sh staging synodal`.

A cancelled remote apply can leave a translation half-loaded. That is recoverable
by construction — re-run the same command, because the first part deletes that
translation's rows before reinserting them. Check what a database actually holds
with the verify query printed at the end of every run.

Verify with a couple of spot queries:

```bash
./apps/api/node_modules/.bin/wrangler d1 execute sdarm-bible --local --config apps/api/wrangler.jsonc \
  --command "SELECT id, verse_count, book_count, lxx_psalms FROM bible_translations"
```

Then add the translation ids you want visible to the KV `bible_translations`
allowlist (Admin → Bible, or `PUT /admin/config/bible_translations`) — e.g.
`["loc:luther1912"]` — and confirm `GET /api/v1/bible/translations` returns it.

## 2. Staging

Staging needs its own database, created once:

```bash
./apps/api/node_modules/.bin/wrangler d1 create sdarm-bible-staging --location=weur --config apps/api/wrangler.jsonc
```

`--location` cannot be changed after creation — this is why it's a flag on
`create`, not a setting to fix later.

Paste the returned database id over the `REPLACE_WITH_STAGING_DB_ID`
placeholder in `apps/api/wrangler.jsonc` (the `BIBLE_DB` entry under
`env.staging.d1_databases`).

Enable the disabled migration step in `.github/workflows/ci.yml`
(`migrate-staging` job) — uncomment the second `wrangler-action` block that
runs `d1 migrations apply sdarm-bible-staging --remote --env staging`. Do this
in the same commit that pastes the id, or staging deploys start failing on the
binding instead of skipping it.

Apply the schema and data the same way as local, adding `--env staging
--remote`:

```bash
./apps/api/node_modules/.bin/wrangler d1 migrations apply sdarm-bible-staging --config apps/api/wrangler.jsonc --env staging --remote

scripts/bible/apply.sh staging
```

From here on, a push to `develop` re-runs the (now enabled) migration step
automatically; re-running the data load by hand is only needed when
`bible-data/` changes.

## 3. Production

Same shape, no `--env`:

```bash
./apps/api/node_modules/.bin/wrangler d1 create sdarm-bible --location=weur --config apps/api/wrangler.jsonc
```

Paste the id over `REPLACE_BEFORE_PRODUCTION_DEPLOY` in the top-level
`d1_databases` entry of `apps/api/wrangler.jsonc`.

Enable the disabled migration step in `.github/workflows/deploy-production.yml`
(`migrate` job) — uncomment the second `wrangler-action` block that runs
`d1 migrations apply sdarm-bible --remote`. Again, same commit as the id.

```bash
./apps/api/node_modules/.bin/wrangler d1 migrations apply sdarm-bible --config apps/api/wrangler.jsonc --remote

scripts/bible/apply.sh production        # prompts before touching production; -y skips the prompt
```

Until both placeholders are replaced, a production deploy of `sdarm-api` fails
on the `BIBLE_DB` binding — see `docs/gotchas.md`.

## Re-ingesting one translation

Fix the source text, or the manifest entry in `scripts/bible/manifest.ts`,
then:

```bash
npx tsx scripts/bible/ingest.ts --only luther1912
```

This regenerates only `scripts/bible/out/luther1912/`. Apply it to whichever
environments need the fix:

```bash
scripts/bible/apply.sh local luther1912
scripts/bible/apply.sh staging luther1912
```

Re-applying is safe even though the translation already has rows there — the
`00-delete.sql` step clears its own rows first, so a full re-apply leaves the
counts identical rather than doubling them (verified locally). There is no need
to touch the other five translations or re-run any migration.

## Files in this folder

| File | Role |
|---|---|
| `usfm.ts` | Source book code → USFM, canonical book order, `toUsfm()` |
| `bookNames.ts` | Localized book names/abbreviations per language, `bookName()` |
| `manifest.ts` | One record per source file: id, slug, name, language, license |
| `ingest.ts` | Reads `bible-data/`, writes chunked SQL to `out/` |
| `apply.sh` | Applies `out/` to one environment: `apply.sh <local\|staging\|production> [slug ...]` |
| `out/` | Generated, gitignored — the actual `wrangler d1 execute` payloads |
