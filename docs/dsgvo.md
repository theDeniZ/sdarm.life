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
| sbl.sdarm.life (`apps/sbl`) | The Sabbath Bible Lesson — carries **its own** Datenschutzerklärung | section9 |
| Resend (Plus Five Five, Inc., US) | Email delivery — newsletter confirmation/welcome/broadcast, book-request forward to `info@sdarm.life`, admin single sends | section10 |

**To add a new processor:** update [de.json + en.json `web.legal.datenschutz`](../packages/i18n/src/messages/) AND ship the code change in the same PR. Not a separate PR, not "TODO later".

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
`web.legal.datenschutz.section8` **stays as long as the YouVersion provider exists at all**,
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

### Sabbath Bible Lesson (sbl.sdarm.life)

`sbl.sdarm.life` serves the **SBL Edition**, a static page originally developed
at [TheMaestr-o/sbl](https://github.com/TheMaestr-o/sbl) and now vendored into
this repository (`apps/sbl/upstream/`). It is served as-is by `apps/sbl`.

**It carries its own Datenschutzerklärung and Impressum** (`datenschutz.html`,
`impressum.html` in the same directory), reachable from the page itself.
`web.legal.datenschutz.section9` names the address, says the offering is separate
and independently maintained, and states that this policy does not apply there.

⚠️ **Since the page is now maintained in this repository, section9's "independently
maintained" wording needs a legal re-check** — it was written when the page was
somebody else's code. Until that is decided, keep the page's own policy pages
accurate for everything below.

⚠️ **What that page does from the reader's browser, and what its own policy
must therefore cover:**

| Call | To | Why it is a transfer |
|---|---|---|
| Bible editions, and any quarter not in its own mirror | `app.sdarm.org` | Reader IP to a third party on page load |
| Quarter list + unpublished quarters — whenever a quarter is missing from our mirror and `app.sdarm.org`, unless the reader has turned the *Alpha-Kanal* off (on by default) | `sbl.thedeniz.dev` | Reader IP to a third party; disclosed in the page's § 4 |

**The home page's lesson card fetches the same quarters server-side**
(`apps/web/app/lib/home-live.ts`): our mirror on `SBL_URL`, then `app.sdarm.org`,
then `sbl.thedeniz.dev`, in the page's own order. Those requests come from the
web worker, not from the reader's browser — they carry no visitor IP or cookie,
so they are no transfer of the visitor's data and need no entry in the home
page's policy. Keep it that way: the card must never fetch these from the client.

A subdomain of `sdarm.life` reads as our service to a German visitor, so if that
page's own policy does not cover the call, the exposure lands here. **Re-check it
whenever `index.html` gains a new external request.**

Checked at the `37a2f1d` upstream commit: that page's § 3 names Cloudflare (and the
`__cf_bm` cookie) in both languages, § 4 names `app.sdarm.org`, and the
Impressum names the Verein. It covers what the page does.

**Google Fonts left this table at upstream commit `10788f5e`.** Until then the
page pulled its faces from `fonts.googleapis.com` / `fonts.gstatic.com` on load —
the LG München I 3 O 17493/20 fact pattern, and the highest-risk item on it. The
page ships all 32 woff2 files in `fonts/`; `scripts/stage.mjs` serves that
directory, so the faces come from `sbl.sdarm.life` and nothing is asked of
Google. **Rules 2 and 1 of the forbidden list apply to `apps/sbl/upstream/` like
any other code of ours** — no CDN fonts, no new client-side third-party fetches
without disclosure.

*Historical note:* v1.4.0 shipped the lesson as a route of `apps/treasures`, with
`apps/api/src/routes/sbl.ts` proxying `app.sdarm.org` server-side and the fonts
self-hosted via `@fontsource`. That is why this file used to describe a
server-side retrieval. All of it — route, proxy, section9 wording — was removed
when the lesson moved to its own host.

### Song open counter — not personal data

`song_opens` (issue #197) stores one integer per song and the time of the most recent open **of that song**. Nothing about the person or the request is written: no IP, no user agent, no session, no per-event row. The user agent is read only to skip crawlers and is discarded. Against the five questions below: no browser call (server-side increment on a request the page already makes), no processor (own D1), no personal data, nothing written client-side, no email. So it adds no processor, needs no Datenschutz entry and no consent, and is not a row in the table below.

⚠️ **The boundary:** the moment this grows a per-event row carrying a timestamp and any request attribute, it is behavioural analytics and this assessment no longer holds. That is a new issue with its own DSGVO pass, not an extension of this one.

### Email delivery (Resend)

Every email leaves through the Resend API, called **server-side** from the Worker
(`RESEND_API_KEY` is a Worker secret): `routes/book-request.ts`,
`routes/subscribers.ts` (double opt-in confirmation + welcome) and
`routes/admin/email.ts` (single send + subscriber broadcast). The visitor's IP never
reaches Resend; what does is listed per call site in `section10`.

- **Legal entity:** Resend is operated by **Plus Five Five, Inc.**, 2261 Market Street
  #5039, San Francisco, CA 94114, USA (as named in Resend's DPA). Not "Resend, Inc.".
- **Transfer basis:** the EU SCCs (Module 2) incorporated in Resend's DPA, which binds on
  acceptance of their Terms of Service; the DPA also states EU-U.S. DPF participation,
  which `section10` reports as Resend's own statement. The EU sending region does not
  move account data, logs or metadata out of the US.
- ⚠️ **`religion` is accepted by the API but not collected by the form.**
  `book-request.ts` has an optional `religion` field that would be forwarded to
  Resend; `BookRequestModal` never sends it, so `section6`/`section10` do not name it.
  Religious belief is Art. 9 data: if the form ever asks for it, both sections must
  name it and the consent must be explicit (Art. 9(2)(a)) — in the same PR.
- **What every email carries** (shared layout, `emails/layout.ts`): links to Impressum and
  Datenschutz and the association's name and address from `legal.impressum.section1Body`;
  mail to subscribers also carries the reason line and a one-click unsubscribe link
  (`/{locale}/unsubscribe?token=…`). Broadcasts, the digest and subscriber-template single
  sends add the `List-Unsubscribe` / `List-Unsubscribe-Post` headers. For a single send the
  API reads the recipient's own subscriber row (token only) to fill the link; a recipient who
  is not a confirmed subscriber gets no subscription lines — nothing claims a consent that
  does not exist. No images, remote CSS or web fonts in any email.
- **A new email type goes into `section10` in the same PR.** So does turning on open
  or click tracking in the Resend dashboard — that is tracking of the recipient and is
  not covered by the current text.

## ⚠️ Known gaps to close

These are currently in code but not fully DSGVO-clean:

| # | Item | Status |
|---|---|---|
| 1 | ~~**Resend** (email sender) — not named in Datenschutz~~ | ✅ **Disclosed** in section10 (see below) — whether to move to an EU provider is still open (#196) |
| 2 | ~~**Unsplash FALLBACK_IMG**~~ | ✅ **Closed** — removed, not moved (see below) |
| 3 | ~~**Wikimedia HeroSection fallback**~~ | ✅ **Closed** — removed with it |
| 4 | **Double opt-in wording** in Datenschutz | Expand section2Body |

**How 2 and 3 were closed.** The images were deleted rather than re-hosted. Every
hotlink was a *fallback* — a stock photo standing in where an editor had not yet set
one — so there was nothing worth copying into R2; the call sites now render no image
at all, and the surrounding gradient or frame carries the layout. `FALLBACK_IMG` is
gone from `apps/web/app/lib/api.ts` and `r2url()`'s existing `null` return is what
call sites guard on.

⚠️ **`next.config.ts` no longer allowlists either host, and that is load-bearing.**
Leaving `images.unsplash.com` in `remotePatterns` would let the next
`<Image src="https://…">` reintroduce the leak silently, with no code review signal.
Adding a remote host back to that list is a DSGVO decision, not a convenience.

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

### Subscriber digest (issue #184)

The automatic "what's new" email (see [api.md](api.md#subscriber-digest)) is the newsletter the subscriber already consented to, not a new processing activity:

- **Same recipients, same basis.** Only rows with `confirmed_at` set receive it — double opt-in stays the gate. Basis is the consent in `legal.datenschutz.section2Body` (Art. 6(1)(a)); UWG §7 is satisfied by the same DOI.
- **Same processor, same data.** Resend receives the email address and the rendered message, exactly as for the welcome email. No new recipient, no new data category. Resend's own disclosure is known gap 1 above (being closed separately); the digest adds volume to that transfer, not a new one — **close gap 1 before switching the digest on in production.**
- **Nothing in the email phones home.** No images, no remote CSS, no web fonts (system font stacks only), no tracking pixel, no link rewriting on our side. ⚠️ Resend's **open/click tracking** is a per-domain dashboard switch: turning it on would add a pixel and redirect every link through Resend — that is behavioural tracking of subscribers and needs its own consent and disclosure. Keep it off.
- **Unsubscribe is one click, twice over.** A visible link in every digest (`/{locale}/unsubscribe?token=…`) and the `List-Unsubscribe` / `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers (RFC 8058), which let the mail client unsubscribe with no page visit. Both hard-delete the row.
- **Impressum in every digest** — association name and address from `legal.impressum.section1Body`, plus links to Impressum and Datenschutz.
- **Off by default.** The owner switches it on in Admin → Email; nothing is sent from any environment without `RESEND_API_KEY`.
- **Wording to confirm.** The subscribe form only says "Newsletter" and does not describe what it contains; section2 speaks of "unseren Newsletter" without content either. A digest of new posts, songs and books is what a church-site newsletter is commonly understood to be, so the consent plausibly covers it — but a one-line description at the point of subscription ("Neuigkeiten zu neuen Beiträgen, Liedern und Büchern") would make the consent specific (Art. 4(11), Art. 7). A legal-text decision for the owner; not changed in #184.

## Language

All user-facing legal and consent copy must be available in **both `de` and `en`**. German is the binding version — add a courtesy note if English diverges. Already done in `legal.courtesyNote`.
