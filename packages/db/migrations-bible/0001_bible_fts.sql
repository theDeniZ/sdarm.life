-- Full-text search over the locally-hosted verses.
--
-- Hand-written: drizzle-kit cannot express an FTS5 virtual table, so this file
-- is not produced by `pnpm generate:bible` and must not be regenerated. A later
-- `generate:bible` will not touch it — drizzle diffs against its own snapshot in
-- `meta/`, which knows nothing about this table.
--
-- Standalone rather than `content='bible_verses'`: the rows are written once by
-- a bulk ingest and never edited one at a time, so external-content triggers buy
-- nothing and would slow the import down. The ingest writes both tables.
--
-- `remove_diacritics 2` folds umlauts and accents, so "Gruesse"/"Grüße" and
-- "crio"/"crió" match — the readers type without diacritics far more often than
-- with them. Cyrillic is unaffected.
CREATE VIRTUAL TABLE bible_verses_fts USING fts5(
  text,
  translation_id UNINDEXED,
  book UNINDEXED,
  chapter UNINDEXED,
  verse UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);
