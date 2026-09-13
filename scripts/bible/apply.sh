#!/usr/bin/env bash
#
# Apply generated Bible SQL to one environment.
#
#   scripts/bible/apply.sh local
#   scripts/bible/apply.sh staging luther1912
#   scripts/bible/apply.sh production -y
#
# Run `npx tsx scripts/bible/ingest.ts` first — this only applies what is
# already in scripts/bible/out/.
#
# Each translation's chunks are concatenated rather than applied as the 135
# separate files on disk. That is the whole point of the script: a per-file loop
# spends ~8 minutes per translation in wrangler start-up alone, against ~10
# seconds concatenated. The chunk filenames already sort into apply order
# (00-delete, 01-translation, 02-books, 03-verses-NN, 04-fts-NN), so
# concatenating in filename order preserves it.
#
# Remote targets additionally split that concatenation into parts of at most
# PART_BYTES. A remote apply is a D1 *import*: wrangler uploads the file, the
# server executes it, and wrangler polls for progress — and it cancels the whole
# thing if a poll takes longer than 15 s. Synodal, the largest at 14 MB, hit
# exactly that ("Cancelled due to no poll() received in 15000ms" after 276 of
# ~290 statements). Smaller parts keep each server-side step inside the poll
# window. Local applies run against a local SQLite file with no import protocol
# and no polling, so they stay a single file and stay fast.
#
# Re-running is safe at any granularity: every translation's SQL deletes its own
# rows first, and that delete is in the first part.
set -euo pipefail

cd "$(dirname "$0")/../.."

WRANGLER=./apps/api/node_modules/.bin/wrangler
CONFIG=apps/api/wrangler.jsonc
OUT=scripts/bible/out

target=${1:-}
shift || true

assume_yes=false
slugs=()
for arg in "$@"; do
  case "$arg" in
    -y|--yes) assume_yes=true ;;
    *)        slugs+=("$arg") ;;
  esac
done

# Max bytes per applied file: 0 means "one file". Remote defaults to 2 MB to
# stay inside D1's import poll window; lower it with BIBLE_PART_BYTES if a slow
# link still trips the 15 s poll timeout. An explicit value always wins, which
# is also how the multi-part path gets exercised against a local database.
case "$target" in
  local)      db=sdarm-bible;         flags=(--local);                default_part=0 ;;
  staging)    db=sdarm-bible-staging; flags=(--remote --env staging); default_part=2000000 ;;
  production) db=sdarm-bible;         flags=(--remote);               default_part=2000000 ;;
  *)
    echo "usage: $0 <local|staging|production> [slug ...] [-y]" >&2
    exit 2
    ;;
esac

PART_BYTES=${BIBLE_PART_BYTES:-$default_part}

if [ ! -d "$OUT" ]; then
  echo "No generated SQL in $OUT — run: npx tsx scripts/bible/ingest.ts" >&2
  exit 1
fi

if [ ${#slugs[@]} -eq 0 ]; then
  for dir in "$OUT"/*/; do slugs+=("$(basename "$dir")"); done
fi

# Production is the one target where a wrong argument is expensive to undo.
if [ "$target" = production ] && [ "$assume_yes" = false ]; then
  printf 'Apply %s to PRODUCTION (%s)? [y/N] ' "${slugs[*]}" "$db"
  read -r reply
  [ "$reply" = y ] || [ "$reply" = Y ] || { echo "Aborted."; exit 1; }
fi

staged=$(mktemp -d)
trap 'rm -rf "$staged"' EXIT

for slug in "${slugs[@]}"; do
  dir="$OUT/$slug"
  [ -d "$dir" ] || { echo "No generated SQL for '$slug' in $OUT" >&2; exit 1; }

  # Group the chunk files into parts, in filename order.
  #
  # When splitting, the delete step gets a part to itself. It is four
  # statements and a few hundred bytes, but one of them —
  # `DELETE FROM bible_verses_fts WHERE translation_id = ?` — is a full scan
  # that rewrites the FTS index row by row, because FTS5 UNINDEXED columns
  # carry no index to find those rows with. Sharing a part with ~2 MB of
  # inserts put that scan and the inserts in one server-side step and reset the
  # database's Durable Object (`{"D1_RESET_DO":true}`). Alone, it gets the whole
  # step to itself.
  rm -f "$staged"/part-*.sql
  part=1
  size=0
  for f in "$dir"/*.sql; do
    fsize=$(wc -c < "$f")
    case "$(basename "$f")" in
      00-delete.sql) isolated=true ;;
      *)             isolated=false ;;
    esac
    if [ "$PART_BYTES" -gt 0 ] && [ "$size" -gt 0 ] &&
       { [ "$isolated" = true ] || [ $((size + fsize)) -gt "$PART_BYTES" ]; }; then
      part=$((part + 1))
      size=0
    fi
    cat "$f" >> "$staged/part-$(printf '%03d' "$part").sql"
    size=$((size + fsize))
    # Nothing may join the delete's part after it.
    if [ "$PART_BYTES" -gt 0 ] && [ "$isolated" = true ]; then
      part=$((part + 1))
      size=0
    fi
  done

  parts=("$staged"/part-*.sql)
  printf '== %s -> %s (%s, %d part(s))\n' "$slug" "$db" "$(du -ch "$dir"/*.sql | tail -1 | cut -f1)" "${#parts[@]}"
  n=0
  for p in "${parts[@]}"; do
    n=$((n + 1))
    [ "${#parts[@]}" -gt 1 ] && printf '   part %d/%d (%s)\n' "$n" "${#parts[@]}" "$(du -h "$p" | cut -f1)"
    "$WRANGLER" d1 execute "$db" --config "$CONFIG" "${flags[@]}" --file="$p" > /dev/null
  done
  rm -f "$staged"/part-*.sql
done

echo
echo "Applied ${#slugs[@]} translation(s) to $db."
echo "Verify:"
echo "  $WRANGLER d1 execute $db --config $CONFIG ${flags[*]} \\"
echo "    --command \"SELECT slug, verse_count, book_count, lxx_psalms FROM bible_translations ORDER BY slug\""
