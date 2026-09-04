# @sdarm/sbl — sbl.sdarm.life

Hosting for the **SBL Edition**, the independent typesetting of the SDARM
Sabbath Bible Lesson maintained at
[TheMaestr-o/sbl](https://github.com/TheMaestr-o/sbl).

This app contains **no application code of its own**. Upstream is a zero-build
static site — one `index.html` with its CSS and JS inline, a service worker, a
mirror of the quarters and the audio recordings — and it is served here exactly
as its author publishes it.

```
apps/sbl/
  upstream/          git submodule, pinned to an upstream commit  ← the contract
  scripts/stage.mjs  copies the served subset of upstream/ into dist/
  wrangler.jsonc     assets-only Worker, no `main`
  dist/              generated, gitignored
```

## Why a pinned submodule

Upstream develops fast and independently — in the last week of August 2026 it
went from 3 lesson languages to 18, added 19 Bible editions, a dark sheet and an
audio player. Nothing there moves here until the submodule pointer is moved
deliberately, so an upstream change can never break this deployment. That is the
entire reason this app exists rather than a port of the page into `apps/treasures`,
which is what v1.4.0 shipped and what this replaces.

## Updating to a newer upstream

```bash
cd apps/sbl/upstream
git fetch origin && git checkout <sha-or-tag>
cd ../../.. && pnpm --filter @sdarm/sbl build   # verify it stages
# commit the moved submodule pointer on a feat/ or bugfix/ branch as usual
```

`stage.mjs` prints any top-level entry upstream has that this app does not know
about — a new asset directory shows up there rather than silently not shipping.

## Local

```bash
pnpm --filter @sdarm/sbl dev     # stages, then wrangler dev on :3005
```

## Legal

The page talks to `fonts.googleapis.com` and `app.sdarm.org` from the reader's
browser. It therefore carries **its own Datenschutzerklärung and Impressum**,
maintained upstream; `sdarm.life`'s own Datenschutzerklärung points at them
rather than describing them. See [docs/dsgvo.md](../../docs/dsgvo.md).

Nothing here rewrites, proxies or patches the page. If that ever has to change,
`stage.mjs` is the one place a transform would go.
