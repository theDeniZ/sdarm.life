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
| Resend (Resend Inc., USA) | Transactional email (book request notifications, newsletter, welcome emails) | section6 |

**To add a new processor:** update [de.json + en.json legal.datenschutz](../packages/i18n/src/messages/) AND ship the code change in the same PR. Not a separate PR, not "TODO later".

## ⚠️ Known gaps to close

These are currently in code but not fully DSGVO-clean:

| # | Item | Status |
|---|---|---|
| 1 | ~~**Resend** (email sender) — not named in Datenschutz~~ | ✅ Disclosed in section6 (PR feat/6-user-db) |
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
