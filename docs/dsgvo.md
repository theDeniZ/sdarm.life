# DSGVO / GDPR — hard rules

`sdarm.life` serves German users from German soil. German users file Abmahnungen for sport. **Every new integration must pass this checklist before it ships.** No exceptions — "we'll fix it later" equals fine letters from Kanzlei X.

## What DSGVO treats as personal data

- Email, name, postal address, phone
- **IP address** ← the one that catches people out
- Cookies, localStorage with identifiers, fingerprints, user-agent + behaviour combos
- Geolocation

If a 3rd-party server sees any of these, it is a **data transfer** and needs: (a) legal basis, (b) disclosure in Datenschutzerklärung, (c) sometimes explicit consent.

## 🚫 Forbidden without disclosure + legal basis

Any of these in new code is a DSGVO violation:

1. **`fetch('https://third-party.tld/...')` from a client component** — leaks user IP on page load
2. **`@import url('https://fonts.googleapis.com/...')`, `<link href="https://cdn.tld/...">`, `<script src="https://cdn.tld/...">`** — loading fonts/CSS/JS from 3rd-party CDNs
3. **`<iframe src="https://youtube.com/...">`, Google Maps embed, Instagram/Twitter embed** — IP leak on page view, not on click
4. **`<img src="https://external.tld/...">`** hotlinks to 3rd-party images (Unsplash, Wikimedia, Gravatar)
5. **Google Analytics, Tag Manager, Meta Pixel, any tracker cookie** — even the "free" analytics
6. **Sending email/name/address to a 3rd party** without naming them in Datenschutz Art. 28
7. **Newsletter send on bare form submit** — UWG §7 requires double opt-in
8. **Setting non-functional cookies on first visit** — requires cookie banner + consent

## ✅ How to do 3rd-party things safely

**Server-side proxy.** If a 3rd-party API is needed, call it from the Hono Worker, not the browser. The user's IP never leaves our infrastructure. Example: address autocomplete → proxy Nominatim via `/api/v1/geocode?q=...`.

**Self-host static assets.** Fonts via `@fontsource/*` (already in `apps/*/package.json`). Images via R2. No hotlinks.

**Click-to-load embeds.** If a YouTube video is really needed on a page, render a thumbnail + play button (`<a href>`), not an iframe. The iframe only loads after the user clicks — that click is consent.

**Server-rendered JSON-LD.** `<script type="application/ld+json">` with structured data is fine (no 3rd-party call, no personal data).

## 📋 Approved processors — already disclosed

These are the only external data recipients currently named in [Datenschutzerklärung](../apps/web/app/[locale]/(legal)/datenschutz/page.tsx):

| Processor | Purpose | Disclosed in |
|---|---|---|
| Cloudflare | Hosting, Web Analytics, CDN | section4 |
| egwwritings.org (White Estate) | EPUB file delivery for Treasures | section5 |
| YouVersion / Life.Church (US) | Bible text for **`yv:` translations only** — `loc:` translations contact nobody | section8 |
| sbl.sdarm.life (third-party page we host) | The Sabbath Bible Lesson — governed by **its own** Datenschutzerklärung, not ours | section9 |

**To add a new processor:** update [de.json + en.json legal.datenschutz](../packages/i18n/src/messages/) AND ship the code change in the same PR. Not a separate PR, not "TODO later".

### Bible feature (treasures.sdarm.life/bible) — two sources

Bible text now comes from either of two places, and which one a visitor hits is an
operator setting:

- **`loc:` translations are ours.** Verse rows in the `sdarm-bible` D1, served from
  our Worker. **No third party is contacted at all** — no transfer, no processor, no
  disclosure obligation beyond hosting itself. The six public-domain texts we host
  are all in this class.
- **`yv:` translations are proxied** from the **YouVersion Platform API**
  (Life.Church, Oklahoma, USA), exactly as before. Nothing is stored; the only
  persisted state is the allowlist in KV.

**Self-hosting is where the GDPR win comes from — not from where the bytes sit.**
Bible text carries no personal data. The exposure in this feature has only ever been
the reader's IP and reading behaviour reaching a US provider, and a `loc:` translation
removes that transfer outright. `--location=weur` on the database is a *copyright*
posture (see below), not a data-protection one.

⚠️ **The disclosure is conditional on the allowlist, and the allowlist is a button in
the admin.** An operator enabling one YouVersion translation re-creates the US transfer
in a single click. Disclosure must precede the transfer, never follow it — so
`legal.datenschutz.section8` **stays as long as the YouVersion provider exists at all**,
even while the allowlist happens to hold only `loc:` ids. Shrink it only when the
provider is removed from the code, not when it merely happens to be unused.

⚠️ **EU placement makes the copyright exposure worse, not better.** German UrhG plus
Abmahnung practice is the most convenient venue a rightsholder could ask for. No server
configuration makes hosting an unlicensed text acceptable — that is what the
per-translation license record and its gates are for, and why every text in the first
batch is public domain. What is actually controllable on the free tier: D1
`--location=weur`, an `eu` jurisdiction R2 bucket for offline bundles. KV is globally
replicated and cannot be restricted — acceptable, it holds only the allowlist.

What keeps the **YouVersion** half defensible:

- **Every call is server-side.** `apps/api/src/services/bible/youversion.ts` runs inside the Worker. The visitor's IP, user-agent and reading behaviour never reach YouVersion — they only see "our Worker asked for JHN.3". Never call YouVersion from a client component.
- **The app key never leaves the Worker.** `YOUVERSION_API_KEY` is a Worker secret, not a `NEXT_PUBLIC_` var.
- **Responses are KV-cached** (chapters 30 days, books 7 days), which keeps request volume — and therefore the metadata YouVersion sees — low.
- **Transfer basis:** Art. 6(1)(f) for the processing, Art. 49(1)(b) for the US transfer (necessary to perform the retrieval the user asked for). YouVersion does not publish SCCs for platform developers. This is disclosed in `section8` and accepted deliberately; revisit if YouVersion ever offers a DPA.
- **No YouVersion branding** in the UI — the Platform Terms forbid using their marks without explicit authorisation. Do not add a "Powered by YouVersion" logo.
- **Publisher copyright notices are rendered** with the text (`.bible-copyright`) — several per-Bible licenses require this. Do not remove it.
- **Do not add "Sign in with YouVersion".** That would send the user's browser to YouVersion directly and trigger consent-banner requirements.
- Reader localStorage keys (`bible_last_read`, `bible_font_scale`, `bible_copy_options`) are functional preferences with no identifiers — same category as `sdarm-theme`.

**Which translations are exposed is an operator decision** (Admin → Bible). Each Bible carries its own license; enabling a restrictively-licensed translation is a licensing decision, not a technical one.

**Every translation carries a license record** (`bible_translations` in `sdarm-bible`):
rights holder, basis (`public-domain` / `permission` / `provider`), the verbatim notice
to render, and the gates `allowDownload` / `allowOffline` / `allowSearchIndex` /
`allowProjector` plus a verse cap. The first three gates are enforced in the API, so a
restriction cannot be forgotten in one client; `allowProjector` is enforced in the
`apps/treasures` UI, because the projector reads the same chapter route as the reader and
an API check would have to trust a client-supplied "I am a projector" flag — which is not
enforcement. That deviation is deliberate and is recorded here rather than papered over.

**Copyright notices render on every surface that shows verse text** — reader, parallel
view, **projector and presenter display**, and the OG metadata. Several licenses require
the notice on the screen shown to a room. Do not remove any of them.

### Sabbath Bible Lesson (sbl.sdarm.life) — hosted, not operated

`sbl.sdarm.life` serves the **SBL Edition**, an independent page maintained at
[TheMaestr-o/sbl](https://github.com/TheMaestr-o/sbl) by its author. We host it
on a subdomain; we do not write it, patch it or proxy it. It is served byte for
byte as published (`apps/sbl`).

**It therefore carries its own Datenschutzerklärung and Impressum**, maintained
upstream and reachable from the page itself. `legal.datenschutz.section9` says
exactly that and nothing more: it names the address, says the offering is
separate and independently maintained, and states that this policy does not
apply there. It deliberately no longer describes *how* the lesson is retrieved —
we would be describing someone else's code, and any description we wrote would
go stale the next time upstream changed.

⚠️ **What that page does from the reader's browser, and what upstream's policy
must therefore cover:**

| Call | To | Why it is a transfer |
|---|---|---|
| Bible editions, and any quarter not in its own mirror | `app.sdarm.org` | Reader IP to a third party on page load |

That is a disclosure obligation which **moved upstream — it did not disappear.**
A subdomain of `sdarm.life` reads as our service to a German visitor, so if that
page's own policy does not cover the call, the exposure lands here. That is the
standing condition of hosting it, and it is the thing to re-check when the
submodule pointer is moved.

Checked at the `37a2f1d` pin: that page's § 3 names Cloudflare (and the
`__cf_bm` cookie) in both languages, § 4 names `app.sdarm.org`, and the
Impressum names the Verein. It covers what the page does.

**Google Fonts left this table at the `10788f5e` pin.** Until then the page
pulled its faces from `fonts.googleapis.com` / `fonts.gstatic.com` on load — the
LG München I 3 O 17493/20 fact pattern, and the highest-risk item on it.
Upstream now ships all 32 woff2 files in `fonts/` and has dropped the
preconnects; `scripts/stage.mjs` serves that directory, so the faces come from
`sbl.sdarm.life` and nothing is asked of Google. **When the pin moves, grep the
staged `index.html` for `fonts.googleapis` before deploying** — a page that
starts asking a CDN for its type again is a fine letter, and it would arrive
here without a line of our code changing.

**Do not "fix" this in `apps/sbl`.** Rewriting the page's fetches or its font
tags would fork it, which is the exact coupling the split exists to remove. If
the arrangement has to change, the answer is upstream, or a transform in
`scripts/stage.mjs` agreed with upstream — not a local edit.

*Historical note:* v1.4.0 shipped the lesson as a route of `apps/treasures`, with
`apps/api/src/routes/sbl.ts` proxying `app.sdarm.org` server-side and the fonts
self-hosted via `@fontsource`. That is why this file used to describe a
server-side retrieval. All of it — route, proxy, section9 wording — was removed
when the lesson moved to its own host.

## ⚠️ Known gaps to close

These are currently in code but not fully DSGVO-clean:

| # | Item | Status |
|---|---|---|
| 1 | **Resend** (email sender) — not named in Datenschutz | Needs disclosure (Art. 28) |
| 2 | **Unsplash FALLBACK_IMG** | Move to R2 |
| 3 | **Wikimedia HeroSection fallback** | Move to R2 |
| 4 | **Double opt-in wording** in Datenschutz | Expand section2Body |

Do not ADD to this list. Close items, do not open new ones.

## Before adding any library or integration, answer these 5 questions

1. **Does it phone home from the browser?** If yes → either make it server-side, remove it, or go through the full consent flow.
2. **Where is its EU entity / data centre?** If US-only and processes personal data → SCCs needed, not a drop-in.
3. **Is it a processor of personal data?** If yes → must be named in Datenschutzerklärung before deploy.
4. **Does it set cookies or use localStorage for identifiers?** If yes → needs consent banner (we do not currently have one — so: don't add).
5. **Does this send marketing/newsletter email?** If yes → requires confirmed double opt-in (UWG §7).

If any answer triggers extra work, **raise it before coding**. Don't merge first and paper over with a Datenschutz diff later.

## Newsletter-specific rules (UWG §7)

- Email cannot be added to the mailing list until the confirmation link is clicked (double opt-in). Already implemented — do not weaken.
- Confirmation email itself must be minimal (no marketing, just the confirm link). Changing this risks classifying it as unsolicited marketing.
- Unsubscribe link must be in every marketing email, one-click, no login required. Already implemented — do not weaken.
- `unsubscribed_at` is a hard delete in this project — good, don't convert to soft-delete without a retention reason disclosed.

## Language

All user-facing legal and consent copy must be available in **both `de` and `en`**. German is the binding version — add a courtesy note if English diverges. Already done in `legal.courtesyNote`.
