# Bible source data

This directory holds the source VPL files for the 3 Bible translations used by the Bible reader. **ZIP files and unzipped contents are gitignored** — operator must download and unzip them before running `pnpm bible:import`.

## Required ZIP files

| Filename | Translation | Lang | Year | License |
|---|---|---|---|---|
| `russyn_vpl.zip` | Russian Synodal | ru | 1876 | Public domain |
| `deu1912_vpl.zip` | German Luther | de | 1912 | Public domain |
| `eng-kjv2006_vpl.zip` | English King James Version | en | 1611 | Public domain |

Source: [eBible.org](https://ebible.org). Each ZIP contains the `*_vpl.txt` data plus license/metadata. All 3 are public domain — no UI attribution required.

## VPL format

Verse Per Line — one verse per line, space-separated:

```
GEN 1:1 In the beginning God created the heaven and the earth.
GEN 1:2 And the earth was without form, and void; and darkness was upon the face of the deep.
…
JHN 3:16 For God so loved the world…
…
REV 22:21 The grace of our Lord Jesus Christ be with you all. Amen.
```

Field layout:
1. Book code (3 chars, eBible USFM variant — see [book-names.mjs](book-names.mjs) for canonical list)
2. Single space
3. Chapter `:` verse
4. Single space
5. Verse text (rest of line)

Lines that don't match get rejected by the import script.

### Book codes used

eBible.org uses a slight variant of USFM — different from canonical USFM 3.1 in a few places:

| eBible | Canonical USFM | Book |
|---|---|---|
| `JOH` | `JHN` | John |
| `MAR` | `MRK` | Mark |
| `PHI` | `PHP` | Philippians |
| `SOL` | `SNG` | Song of Solomon |
| `1JO`/`2JO`/`3JO` | `1JN`/`2JN`/`3JN` | John epistles |

We use eBible's variant throughout (it's what the source data has). Full list of all 66 codes in [book-names.mjs](book-names.mjs).

## Workflow

```bash
# 1. Place the 4 ZIPs into scripts/bible-data/
#    Drag-drop into VS Code file panel works. Or scp from your Mac:
#    scp ~/Downloads/{russyn,deu1912,deu1951,eng-kjv2006}_vpl.zip \
#        <user>@<dev-host>:/workspaces/sdarm.life/scripts/bible-data/

# 2. Unzip each (extracts the .txt + copyright/metadata files)
cd scripts/bible-data
for z in *_vpl.zip; do
  unzip -o -q "$z" -d "${z%.zip}/"
done

# 3. Run the importer — produces *.sql files
cd ../..
pnpm bible:import
# Expected: 3 translations, ~3,900 chapters, ~93,300 verses

# 4. Apply locally
pnpm wrangler d1 execute sdarm-db --config apps/api/wrangler.jsonc \
  --file=scripts/bible-data/all.sql

# 5. (later) apply to remote, after the schema migration is applied by CI
pnpm wrangler d1 execute sdarm-db --remote --config apps/api/wrangler.jsonc \
  --file=scripts/bible-data/all.sql
```

## Verification

```bash
./apps/api/node_modules/.bin/wrangler d1 execute sdarm-db \
  --config apps/api/wrangler.jsonc \
  --command="SELECT (SELECT count(*) FROM treasures WHERE type='bible') AS bible_treasures, (SELECT count(*) FROM bible_translations) AS translations, (SELECT count(*) FROM bible_books) AS books, (SELECT count(*) FROM bible_verses) AS verses"
# Expected: 3 / 3 / 198 / ~93,300

# Sample: KJV John 3:16
./apps/api/node_modules/.bin/wrangler d1 execute sdarm-db \
  --config apps/api/wrangler.jsonc \
  --command="SELECT v.text FROM bible_verses v JOIN bible_books bb ON bb.id=v.book_id JOIN bible_translations bt ON bt.id=bb.translation_id WHERE bt.code='kjv' AND bb.code='JOH' AND v.chapter=3 AND v.verse=16"
```

## License attestation per translation

The import script writes the `copyright` and `license` columns:

| Code | copyright | license |
|---|---|---|
| `synodal` | NULL | `public-domain` |
| `luther1912` | NULL | `public-domain` |
| `kjv` | NULL | `public-domain` |

Adding a new translation requires:
1. Verifying license is genuinely usable (PD or compatible like CC-BY).
2. Adding entries to `BOOK_NAMES[<lang>]` in [book-names.mjs](book-names.mjs) if a new language is introduced.
3. Adding to `TRANSLATIONS` array in [../import-bible.mjs](../import-bible.mjs).
4. Updating the catalogue UI to handle the new card.
5. **DSGVO check** — if the new processor stores any user data, add to [docs/dsgvo.md](../../docs/dsgvo.md). Self-hosted text only does NOT require disclosure.
