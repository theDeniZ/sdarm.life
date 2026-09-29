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

## The site navigation is a copy

The page carries its own copy of the site's navigation — the "site nav" blocks
in `upstream/index.html` (styles in `<head>`, markup and script at the top of
`<body>`). It is static HTML/CSS/JS rebuilt from `@sdarm/ui`'s `Navbar.tsx` and
`navbar.css`, because this page cannot import the React component. **Whenever
the shared Navbar changes — links, their order, labels, hosts, sizes,
breakpoints, colours — change the copy here in the same branch.**

It has everything the shared bar has, in the same places — the links, the
"EN"/"DE" switcher and the sun/moon theme toggle on the right, beside the burger
on phones — but the two controls work the sheet's own settings instead of the
site's routes:

- **Language.** The switcher sets the language of the sheet, through the ⚙
  language list itself: the choice is saved as `sbl.lang`, the address's
  `#<lang>/<date>` link follows it, and the nav relabels because it reads
  `<html lang>`. The nav speaks de or en; it takes the sheet's language when it
  is one of those, otherwise the browser's, otherwise German. The switcher
  offers the other one, as on the rest of the site — on a sheet in Russian with
  German labels it reads "EN", and a tap puts the sheet into English. The other
  twenty languages are chosen in ⚙.
- **Theme.** The toggle calls the sheet's `setTheme` with the opposite of what
  `html.dark` says now, so it is saved as `sbl.theme` and lit in ⚙'s theme row;
  a choice made in ⚙ repaints the toggle's icon and the nav's colours through
  `html.dark`. A tap is an explicit light or dark, leaving "follow the system",
  as the site's toggle does.

**First visit:** with no saved choice and no language in the link, the sheet
opens in German. A saved `sbl.lang`, or a link like `#en/20260826`, wins.

Other deliberate differences: the sheet's own glass as the nav's ground, and
fixed heights per breakpoint (`--sn-h`) that the sheet's sticky toolbar and
`mkBarH` read. Its Lexend faces are self-hosted in `upstream/fonts/` and listed
in `sw.js`; any change to the page's shell needs the `SHELL` cache name in
`sw.js` bumped.

## Local

```bash
pnpm --filter @sdarm/sbl dev     # stages, then wrangler dev on :3005
```

## Legal

The page calls `app.sdarm.org` from the reader's browser and carries **its own
Datenschutzerklärung and Impressum** (`upstream/datenschutz.html`,
`upstream/impressum.html`). Keep them accurate whenever the page gains a new
external request. See [docs/dsgvo.md](../../docs/dsgvo.md).
