/**
 * Stage the served subset of the upstream SBL page into `dist/`.
 *
 * This is the whole "build". Upstream (github.com/TheMaestr-o/sbl, pinned here
 * as the `upstream/` submodule) is a zero-build static site — one index.html
 * with its CSS and JS inline, a service worker, a mirror of the quarters and
 * the recordings. Nothing is compiled and, deliberately, nothing is rewritten:
 * the page is served exactly as its author publishes it, and it carries its own
 * Datenschutzerklärung and Impressum for what it does from the reader's
 * browser. See docs/dsgvo.md.
 *
 * The step exists only so this app produces a `dist/` the shared
 * `_build-pages.yml` / `_deploy-pages.yml` workflows can carry like any other
 * app's `.open-next`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'upstream');
const out = join(root, 'dist');

/* An allowlist, not an ignore list. Upstream is a working repository with
   drafts, screenshots, planning notes and pull scripts in it; naming what is
   served means a file appearing up there is never published here by accident.
   The cost is that a genuinely new asset directory has to be added below — so
   anything unrecognised is reported rather than passed over in silence. */
const SERVE = ['index.html', 'sw.js', 'data', 'audio'];

/* Never served: upstream's own tooling and working files. Listed so the report
   at the end can tell "known, deliberately skipped" from "new upstream, look
   at me". */
const KNOWN_SKIP = [
  '.git',
  '.gitignore',
  '.claude',
  'screenshots',
  'tools',
  'README.md',
  'PLAN.md',
  'IDEAS.md',
  'sbloutline.css',
  'sbloutline-preview.html',
  'sbloutline-test.html',
  'sbloutlinedemo.html',
];

/* An unchecked-out submodule is an empty directory, and an empty directory
   copies without complaint — which would deploy a blank site over a working
   one. Fail here instead. `git submodule update --init` is the fix, and in CI
   it is `submodules: true` on actions/checkout. */
if (!existsSync(join(src, 'index.html'))) {
  console.error(
    `\n  apps/sbl: upstream/index.html is missing.\n\n` +
      `  The upstream submodule is not checked out. Run:\n` +
      `      git submodule update --init --recursive\n` +
      `  In CI, add \`submodules: true\` to the actions/checkout step.\n`
  );
  process.exit(1);
}

/* Node 24's cpSync(recursive) fails with EACCES on the overlay filesystem this
   project's devcontainer runs on — the reason tools/patch-cp.cjs exists for the
   Next apps. Walking it by hand sidesteps that entirely and costs nothing at
   this size. */
function copyInto(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const a = join(from, entry);
    const b = join(to, entry);
    if (statSync(a).isDirectory()) copyInto(a, b);
    else copyFileSync(a, b);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let files = 0;
let bytes = 0;
for (const name of SERVE) {
  const from = join(src, name);
  if (!existsSync(from)) {
    console.warn(`  · ${name} — not in upstream at this pin, skipped`);
    continue;
  }
  if (statSync(from).isDirectory()) copyInto(from, join(out, name));
  else copyFileSync(from, join(out, name));
}

function tally(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) tally(p);
    else {
      files++;
      bytes += s.size;
    }
  }
}
tally(out);

const unexpected = readdirSync(src).filter((e) => !SERVE.includes(e) && !KNOWN_SKIP.includes(e));
if (unexpected.length) {
  console.warn(`\n  apps/sbl: upstream has entries this app does not know about:`);
  for (const e of unexpected) console.warn(`      ${e}`);
  console.warn(`  Add them to SERVE in scripts/stage.mjs if they belong on the site.\n`);
}

console.log(`  apps/sbl: staged ${files} files (${(bytes / 1024 / 1024).toFixed(1)} MB) into dist/`);
