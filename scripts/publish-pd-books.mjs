#!/usr/bin/env node
/**
 * Publish the public-domain book corpus: EPUBs to R2, metadata to the treasures API.
 *
 *   node scripts/publish-pd-books.mjs --env local --execute
 *   node scripts/publish-pd-books.mjs --env staging
 *   node scripts/publish-pd-books.mjs --env staging --execute
 *   node scripts/publish-pd-books.mjs --env production --execute
 *
 * Dry-run by default. Nothing is uploaded or posted without --execute.
 *
 * Source of truth is pd-books/catalog/catalog-manifest.json, produced by
 * pd-books/catalog/build_catalog.mjs. Each entry carries the local `sourceFile`
 * and the intended `r2Key`, so this script never guesses filenames.
 *
 * WHY THIS EXISTS RATHER THAN scripts/import-treasures.mjs:
 * that script hardcodes de-books.json and re-maps 8 fields. More importantly,
 * POST /admin/treasures/batch is NOT idempotent — it is a bare
 * Promise.all(items.map(createTreasure)) with no upsert and no unique constraint
 * on title or epub_url, so re-running it duplicates every row with no way back
 * except manual deletes. This script therefore reads the existing treasures
 * first and only creates what is genuinely missing.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = resolve(ROOT, 'pd-books/catalog/catalog-manifest.json');
// Default persist dir `wrangler dev` uses for apps/api (cwd-relative, no override in wrangler.jsonc).
const LOCAL_R2_PERSIST = resolve(ROOT, 'apps/api/.wrangler/state');
// The repo pins wrangler in apps/api's devDependencies. Shelling out to `npx wrangler`
// instead ignores that pin — with no cached npx install, every single call (one per
// book) re-resolves and reinstalls wrangler from the registry into ~/.npm/_npx, which
// is both ~100x slower per call and enough memory/IO pressure under this container's
// limits to OOM-kill unrelated processes (including a running `wrangler dev`).
const WRANGLER_BIN = resolve(ROOT, 'apps/api/node_modules/.bin/wrangler');

const ENVS = {
  local: {
    bucket: 'sdarm-images',
    api: process.env.LOCAL_API_URL ?? 'http://localhost:8787',
    local: true,
  },
  staging: {
    bucket: 'sdarm-images-staging',
    api: process.env.STAGING_API_URL ?? 'https://sdarm-api-staging.mine-a8f.workers.dev',
  },
  production: {
    bucket: 'sdarm-images',
    api: process.env.PROD_API_URL ?? 'https://api.sdarm.life',
  },
};

function parseArgs(argv) {
  const out = { env: 'staging', execute: false, includeFlagged: false, only: null, skipUpload: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env') out.env = argv[++i];
    else if (a === '--execute') out.execute = true;
    else if (a === '--include-flagged') out.includeFlagged = true;
    else if (a === '--skip-upload') out.skipUpload = true;
    else if (a === '--only') out.only = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

const HELP = `
publish-pd-books — upload PD EPUBs to R2 and register them as treasures

  --env <local|staging|production>  target environment     (default: staging)
  --execute                   actually upload and post     (default: dry run)
  --include-flagged           also publish works whose source EPUB carries a
                              third-party copyright assertion in its OPF
                              (default: these are HELD BACK pending legal review)
  --only <substring>          restrict to slugs containing this substring
  --skip-upload               only sync metadata, assume R2 objects already exist

Requires ADMIN_API_KEY in the environment for the metadata step.
R2 upload shells out to wrangler, which must already be authenticated.
`;

/** OPF rights strings that mean "someone else asserts a copyright over this file". */
function rightsConcern(opfRights) {
  if (!opfRights) return null;
  const r = String(opfRights);
  if (/public domain/i.test(r)) return null;
  if (/White Estate/i.test(r)) return 'White Estate copyright assertion';
  if (/Ethereal|CCEL/i.test(r)) return 'CCEL copyright assertion';
  if (/copyright|\(c\)|©/i.test(r)) return `Copyright assertion: ${r.slice(0, 60)}`;
  return null;
}

async function fetchExistingTreasures(api, key) {
  const res = await fetch(`${api}/api/v1/admin/treasures`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`GET /admin/treasures failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.items ?? [];
}

function uploadToR2(env, key, file, execute) {
  const args = ['r2', 'object', 'put', `${env.bucket}/${key}`, '--file', file, '--content-type', 'application/epub+zip'];
  if (env.local) args.push('--local', '--persist-to', LOCAL_R2_PERSIST);
  else args.push('--remote');
  if (!execute) return `wrangler ${args.join(' ')}`;
  execFileSync(WRANGLER_BIN, args, { cwd: ROOT, stdio: 'pipe' });
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);

  const env = ENVS[args.env];
  if (!env) throw new Error(`--env must be one of: ${Object.keys(ENVS).join(', ')}`);
  if (!existsSync(MANIFEST)) throw new Error(`Manifest not found: ${MANIFEST}\nRun pd-books/catalog/build_catalog.mjs first.`);
  // Fail fast, before the upload loop starts, with a fix rather than a stack trace on
  // book 1 of 68. Deliberately never falls back to `npx wrangler` — see WRANGLER_BIN comment.
  if (args.execute && !args.skipUpload && !existsSync(WRANGLER_BIN)) {
    throw new Error(`wrangler binary not found at ${WRANGLER_BIN}\nRun: cd apps/api && pnpm install`);
  }

  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) throw new Error('ADMIN_API_KEY is not set — required to read and write treasures.');

  const raw = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const all = Array.isArray(raw) ? raw : (raw.works ?? raw.items ?? []);

  const skipped = [];
  const publish = [];

  for (const w of all) {
    if (args.only && !w.slug.includes(args.only)) continue;

    const file = resolve(ROOT, w.sourceFile.replace(/^pd-books\//, 'pd-books/'));
    if (w.sourceRejectedElsewhere) {
      skipped.push([w.slug, 'source EPUB was rejected by the QA stage']);
      continue;
    }
    if (!existsSync(file)) {
      skipped.push([w.slug, `local file missing: ${w.sourceFile}`]);
      continue;
    }
    const concern = rightsConcern(w.opfRights);
    if (concern && !args.includeFlagged) {
      skipped.push([w.slug, `held for legal review — ${concern}`]);
      continue;
    }
    publish.push({ ...w, file, concern });
  }

  const existing = await fetchExistingTreasures(env.api, apiKey);
  const seen = new Map(existing.map((t) => [`${t.title}||${t.author ?? ''}`, t]));

  const toCreate = [];
  const already = [];
  for (const w of publish) {
    const hit = seen.get(`${w.title}||${w.author}`);
    (hit ? already : toCreate).push(w);
  }

  const mode = args.execute ? 'EXECUTE' : 'DRY RUN';
  console.log(`\n${mode} · env=${args.env} · bucket=${env.bucket} · api=${env.api}`);
  console.log(`manifest: ${all.length} works · publishable: ${publish.length} · already present: ${already.length} · to create: ${toCreate.length}\n`);

  if (skipped.length) {
    console.log(`HELD BACK (${skipped.length}):`);
    for (const [slug, why] of skipped) console.log(`   ${slug.padEnd(46)} ${why}`);
    console.log();
  }

  if (!toCreate.length && !args.skipUpload && !publish.length) {
    console.log('Nothing to do.');
    return;
  }

  // ── 1. R2 upload ───────────────────────────────────────────────────────────
  if (!args.skipUpload) {
    let bytes = 0;
    console.log(`UPLOADING ${publish.length} EPUBs to r2://${env.bucket}/books/`);
    for (const w of publish) {
      const size = statSync(w.file).size;
      bytes += size;
      const cmd = uploadToR2(env, w.r2Key, w.file, args.execute);
      console.log(`   ${args.execute ? 'put ' : '    '}${w.r2Key.padEnd(56)} ${(size / 1024).toFixed(0)} kB`);
      if (cmd) console.log(`        ${cmd}`);
    }
    console.log(`   total ${(bytes / 1e6).toFixed(1)} MB\n`);
  }

  // ── 2. metadata ────────────────────────────────────────────────────────────
  const payload = toCreate.map((w) => ({
    title: w.title,
    author: w.author,
    description: w.description,
    type: 'book',
    language: w.language,
    coverGradient: null,
    coverAccentColor: null,
    coverKey: null,
    isFree: true,
    price: null,
    sortOrder: w.sortOrder,
    epubUrl: null,
    epubKey: w.r2Key,
  }));

  console.log(`POSTING ${payload.length} treasure rows to ${env.api}/api/v1/admin/treasures/batch`);
  for (const w of already) console.log(`   skip (exists)  ${w.title}`);
  for (const p of payload) console.log(`   create         ${p.title}`);

  if (!args.execute) {
    console.log('\nDry run — nothing uploaded, nothing posted. Re-run with --execute.');
    return;
  }
  if (!payload.length) {
    console.log('\nAll rows already present; metadata step skipped.');
    return;
  }

  // Chunked: 80 concurrent D1 inserts in one Worker request is more than this
  // endpoint has been exercised with. 25 at a time keeps it well inside limits.
  const CHUNK = 25;
  let created = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK);
    const res = await fetch(`${env.api}/api/v1/admin/treasures/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`batch ${i / CHUNK + 1} failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    created += body.created ?? chunk.length;
    console.log(`   chunk ${i / CHUNK + 1}: created ${body.created ?? chunk.length}`);
  }
  console.log(`\nDone — ${created} treasures created.`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
