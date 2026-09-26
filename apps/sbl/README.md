# @sdarm/sbl — sbl.sdarm.life

The **SBL Edition**, a typesetting of the SDARM Sabbath Bible Lesson. It was
developed at [TheMaestr-o/sbl](https://github.com/TheMaestr-o/sbl) and is now
vendored here and maintained in this repository.

It is a zero-build static site — one `index.html` with its CSS and JS inline, a
service worker, its own web fonts, a mirror of the quarters — served by an
assets-only Worker.

```
apps/sbl/
  upstream/          the page itself — plain tracked files, edit them here
  scripts/stage.mjs  copies the served subset of upstream/ into dist/
  wrangler.jsonc     assets-only Worker, no `main`
  dist/              generated, gitignored
```

`upstream/` keeps its name from when it was a git submodule.

## Changing the page

Edit the files in `upstream/` on a `feat/` or `bugfix/` branch as usual, then:

```bash
pnpm --filter @sdarm/sbl build   # verify it stages
```

`stage.mjs` serves an allowlist (`SERVE`) and prints any top-level entry it does
not know about — a new asset directory shows up there rather than silently not
shipping.

## Local

```bash
pnpm --filter @sdarm/sbl dev     # stages, then wrangler dev on :3005
```

## Legal

The page calls `app.sdarm.org` from the reader's browser and carries **its own
Datenschutzerklärung and Impressum** (`upstream/datenschutz.html`,
`upstream/impressum.html`). Keep them accurate whenever the page gains a new
external request. See [docs/dsgvo.md](../../docs/dsgvo.md).
