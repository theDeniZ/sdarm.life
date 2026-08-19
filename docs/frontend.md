# Frontend reference

## `apps/web` component map

| Component | Type | Notes |
|---|---|---|
| `layout.tsx` | Server | Root layout — imports CSS, renders `{children}` (no `<html>` — delegated to locale layout) |
| `[locale]/layout.tsx` | Server (async) | Locale layout — validates locale, wraps in `<NextIntlClientProvider>`, renders `<html lang={locale}><body>` |
| `[locale]/page.tsx` | Server (async) | Home page — fetches all data in parallel, maps to component types, passes as props |
| `[locale]/posts/[slug]/page.tsx` | Server (async) | Post detail page |
| `Navbar` | **Client** (`@sdarm/ui`) | Fixed nav; transparent → frosted glass on scroll. Mobile hamburger menu. Uses `useTranslations('common.nav')`. Includes language switcher (DE/EN) and a sun/moon theme toggle that dispatches `sdarm:toggle-theme`. |
| `HeroWelcome` | **Server** (async) | 3D Earth landing hero — renders `<PlanetEarth />` with grain overlay, badge, title, subtitle, and CTA link to `/{locale}/about`. Uses `web.heroWelcome` i18n namespace. |
| `PlanetEarth` | **Client** | Three.js WebGL globe with day/night textures, atmosphere shader, cloud layer. Self-hosted textures in `/public/textures/` (MIT, no CDN, DSGVO clean). |
| `StatsGrid` | **Client** | Bento grid of five blocks — the homepage's main section. Reads `HomeGridConfig` from the `home_grid` KV key, falls back to the built-in defaults. Fits every headline to its card. |
| `NewsSection` | **Client** | Former masonry section, replaced on the homepage by `StatsGrid`. File and `styles/news.css` are kept but neither is rendered nor imported. |
| `ProductsSection` | **Client** | 3-col editorial banner — category tabs, central image, text panel, counter/arrows |
| `ScriptureVerseSection` | **Client** | Daily rotating Scripture verse with `QuoteShareModal`. Verse rotated hourly from `lib/verses.ts` (DE + EN). |
| `GlaubensLongRead` | **Client** | 25 SDA Reform faith articles with accordion and hanging number layout. Detail content from sta-ref.de. |
| `QuoteShareModal` | **Client** | Canvas-rendered verse share images. Themes: dark/light/paper. Formats: landscape (16:9), square (1:1), portrait (4:5). |
| `Footer` | **Client** (`@sdarm/ui`) | Dark theme — dot-grid, 3-column grid: contact+subscribe, nav links, location-aware sunset clock. Uses `useTranslations('common.footer')`. |

**Not rendered on home page** (files kept for future use): `VideoSection`, `SongbookSection`, `AboutSection`, `BgCanvas`.

`page.tsx` fetches in parallel: featured posts, news posts, latest video post, config — `cache: 'no-store'`. All return `null` on error → components fall back to static data silently.

Data mappers: `toNewsPost`, `toFooterConfig`.

### Post detail page (`[locale]/posts/[slug]/page.tsx`)

Server component with edge runtime. Fetches single post + up to 5 other posts + config in parallel. Section labels are localized via `getTranslations('web.post')`.

**Layout:** `.post-hero` (cover image as full-bleed background + `.post-hero-overlay` gradient + back button) → `.post-section` with translated "Content" label (body text) → `.post-section` with "Video" (if `videoUrl` set, play button overlay) → `.post-section` with translated "More posts" (`.post-grid` of `.post-card` items, responsive grid).

CSS classes (in `globals.css`): `.post-hero`, `.post-hero-bg`, `.post-hero-overlay`, `.post-back`, `.post-meta`, `.post-section`, `.post-section-label`, `.post-body`, `.post-video`, `.post-video-card`, `.post-video-play`, `.post-more-title`, `.post-grid`, `.post-card`, `.post-card-img`, `.post-card-title`, `.post-card-meta`.

### HeroWelcome

Server component (async). Renders the home page landing hero — no client bundle, no interactivity of its own.

**What it renders:**
- `<PlanetEarth />` — the Three.js WebGL globe (Client component, lazy-loaded)
- Grain overlay div
- `<h1>` with gold italic accent via `t.rich()` and `<em>`
- Subtitle paragraph
- `<Link>` CTA button pointing to `/{locale}/about`

**i18n namespace:** `web.heroWelcome` (keys: `title`, `subtitle`, `ctaPrimary`, `ctaSecondary`).

**Height is bounded, not a bare `vh`.** `min-height: clamp(430px, 62vh, 660px)` (`clamp(420px, 65vh, 560px)` below 700px). The content inside is a fixed ~430px tall whatever the screen, so a bare `62vh` kept growing away from it — a 1366px-tall iPad portrait produced an 847px hero holding 411px of nothing, and the planet, anchored at `top: 105%` of the hero, detached from the text and left a black band. The upper bound stops the hero outgrowing what it holds; `62vh` still governs every landscape desktop, where the viewport is wide and short, so desktop is unchanged at 558px.

**Tablet and phone use `min-height: 56.25vw`** — 9/16 of the width, so the hero is a 16:9 band at every tablet size (744 → 419px, 820 → 461px, 1024 → 576px, all exactly 1.78:1). Phones cannot reach it: a two-line title, a two-line subtitle and the button come to ~310px against the 219px that 16:9 allows at 390px, so the band settles at ~1.26:1 and the content sets the height. Closing that gap means cutting copy, not CSS.

**The planet floor is 480px, not 640px.** `width: clamp(480px, 100vw, 1400px)`. At 640px the sphere came out 1.71× the viewport on a 375px phone and its arc flattened into a horizon line, while a tablet under the same rule got a real curve — the same element read differently per breakpoint.

**The CTA is filled flat `--gold`** with a soft ambient shadow and one hairline along the top edge: a gradient ramp plus inner gloss reads as a 2005 candy button. Hover runs a low-contrast gleam across the surface and swaps the arrow — the resident one exits right, its replacement arrives from the left out of a clipped slot. Both are disabled under `prefers-reduced-motion`.

**CSS class prefix:** `hero-welcome-*` — all classes are defined in `apps/web/app/globals.css`: `hero-welcome`, `hero-welcome-bg`, `hero-welcome-planet`, `hero-welcome-grain`, `hero-welcome-content`, `hero-welcome-badge`, `hero-welcome-badge-dot`, `hero-welcome-title`, `hero-welcome-sub`, `hero-welcome-cta`, `hero-welcome-cta-label`.

### StatsGrid bento grid

`'use client'`. The homepage's main section, in place of the old Releases masonry.

**Layout.** Outer `display: grid` of three equal columns; each column is a flex stack sharing one gap, so the column bottoms line up. The heights do the arithmetic and are the reason no sixth block can be added:

```
col 1  724
col 2  420 + 24 + 280 = 724
col 3  350 + 24 + 350 = 724
```

**The five blocks.** `plan` (reading plan, photo, external link) · `verse` (verse of the hour, opens `QuoteShareModal`) · `invite` (invitation, links to Kontakt) · `book` (latest treasure, from the API) · `faith` (25 points, ghost numeral).

**Headline fitting.** Card text varies far too much for one type size — the verse alone runs 21 to 112 characters. An effect steps `[data-fit]` elements down a fixed size ladder until the card fits. It measures against the card's `min-height`, **not** its current height: a card that has already overflowed reports the grown height and every size then looks like it fits, which silently knocks the columns out of alignment. It also checks `scrollWidth` so a single long word wraps instead of running past the card edge.

**Verse emphasis.** `splitVerse()` in [lib/verses.ts](../apps/web/app/lib/verses.ts) picks one word to mark: a concept (`Liebe`, `Gnade`, `Hirte`, `erquicken`, …) first, the divine name only if the verse carries no concept, and the longest word as a last resort. Concepts come first because `Gott` appears in most verses — marking it every hour marks nothing. Across the 32 German verses this picks 25 distinct words. The mark is a hand-drawn SVG stroke, not a rectangle.

**No section heading.** The five cards speak for themselves; there is no eyebrow and no `<h2>` above them. `HomeGridConfig` therefore carries `blocks` only.

**Card heights are fixed, not floors.** Each is one number on `--stats-card-h` applied as `height`. As a `min-height` a long verse pushed its card taller, and because the mobile columns are balanced by those heights (240 + 12 + 192 = 444 = 216 + 12 + 216) the two columns stopped ending level — 37px apart at 360px. It looked intermittent only because the verse rotates hourly and only the long ones did it.

**The fitter compares edges, not heights.** A fixed box reports its own clamped height at every size, so asking the *card* whether it fits always says yes while the text is quietly clipped. The body's `scrollHeight` is no better: `.stats__card-content` sits on `margin-top: auto`, and an auto margin in a fixed-height flex column leaves `scrollHeight` a few pixels above `clientHeight` whatever the type size — 4px on the songbook card at every rung from 64 down to 13, which set 17px type on a card with room for 56. It compares the last child's bottom edge against the body's instead, which is exact and blind to the auto margin. `HEADLINE_SIZES` reaches 13px so the worst case in the pool — a 112-character verse in a 156px-wide card at 360px — still fits.

**Button labels are one word** (`Öffnen` · `Besuchen` · `Nachlesen`) and `.stats__btn` carries `white-space: nowrap`. A pill that wraps stops being a pill: with the old multi-word labels the text broke over three lines inside the capsule at 360px and grew past the card edge.

**The `book` block is the songbook.** It links to `newsData.song.href`, which already carries the songbook URL per environment. With a photo it shows only its label — the picture says "songbooks" and a headline on top competes with it. Without one it falls back to the headline, because the default config has no image and the card would otherwise be a label on an empty rectangle. An editor's override always wins.

**`SHOW_VERSE_SAVE` is temporarily `false`** — the save-as-image affordance on the verse card is hidden while the image `QuoteShareModal` produces is still being designed. The button and the modal are untouched underneath. Note the whole verse card is still clickable and opens the same modal.

**Config.** `HomeGridConfig` decides visibility, clickability, link, label/button visibility, per-locale text overrides and the image (key, crop, scrim, text colour). Empty text means "use the translation", so copy stays in the message files unless an editor overrides it.

**Preview.** With `?gridPreview=1` the section listens for a `sdarm:grid-preview` `postMessage` and renders that draft instead, and scrolls itself into view. The admin's preview is this page in an iframe, so it cannot drift from what visitors see.

### NewsSection masonry gallery (no longer rendered)

`'use client'` masonry grid. Receives news posts via `posts?: NewsPost[]`. Falls back to static data. Returns `null` if array is empty.

**`NewsPost` interface:** `id`, `title`, `date`, `author`, `body`, `imageUrl`, `imageAlt`, `href`.

**Layout:** `.events-section` (dark `#0e0d0b` bg) → `.neues-header` (eyebrow, `<h2>`, subtitle) → `.masonry-wrap` → `.masonry-grid` (CSS `columns`). Each post renders as a `<Link className="masonry-item ratio-*">` wrapping `.img-wrap` with `<Image fill>`.

**Aspect ratio cycle** (repeats via `i % 4`): `ratio-16-9` → `ratio-9-16` → `ratio-1-1` → `ratio-3-4`. Applied via CSS `aspect-ratio` on `.img-wrap`.

**Stagger animation:** `IntersectionObserver` (threshold 0.08) adds `.is-visible` to each item with a 60 ms delay per index. Items start at `opacity: 0; transform: translateY(18px)` and transition to visible. Observer is re-created on `posts` change.

**Hover:** image scales 1.04×, brightness/saturation restore, gold-tinted veil fades in via `::after`.

**Columns:** 5 (desktop) → 4 (≤900px) → 2 (≤600px). Column order is top→bottom per column (CSS columns, not Masonry.js).

### ProductsSection editorial banner

`'use client'` banner. Uses static `STATIC_PRODUCTS` data with `Product` interface: `id`, `imageUrl`, `imageAlt`, `category`, `tag`, `title`, `description`, `meta`, `href?`.

**Layout:** `.prod-banner-stage` is a CSS grid with 3 columns: vertical category tabs (`.prod-cats`) | central image (`.prod-img-wrap`) | text panel (`.prod-text-panel`) + counter/arrows (`.prod-nav`). Clicking a category tab jumps to the first product in that category.

### Footer sunset clock

`'use client'`. 3-column CSS grid (`1fr 1fr 260px`). Props: `config?: FooterConfig`, `apiUrl?`, `webUrl?`, `songbookUrl?`, `eventsUrl?`, `treasuresUrl?`. All visible text uses `useTranslations('common.footer')` and `useTranslations('common.clock')`.

**The newsletter capsule has one fixed width** (`max-width: 220px`). It used to start at 150px and animate to 220px on focus or once text was typed; that moved the submit button 70px out from under the pointer mid-click and reflowed the column beside it, while revealing nothing — the field was equally usable at either width (issue #132). Only colour reacts to focus now.

**Columns:**
1. **Contact** — heading, social links (fb/wa/ig/yt), email subscribe form with status feedback
2. **Nav** — navigation links (translated via `useTranslations('common.nav')`)
3. **Sunset clock** — SVG arc ring + countdown label

**Sunset clock logic:**
- Sunrise/sunset times computed locally via `suncalc` (no third-party API call → DSGVO clean)
- Default location: Pforzheim, Baden-Württemberg. Persisted user picks override the default via `localStorage.sdarm_sunset_location`
- Updates every 1 s via `setInterval`; SVG ring transition is `0.9s` cubic-bezier
- SVG ring: `r=76`, `CIRC ≈ 477.52px`, `strokeDashoffset = CIRC * (1 - progress)`

**Location state ownership:**
Footer is the single owner of `current: StoredLocation = { lat, lng, name, slug? }`. The `<CommunityMap />` and the location autocomplete input are presentational consumers — they call `onPick(loc)` to change the current location. Storage helpers live in [packages/ui/src/lib/sunset-location.ts](../packages/ui/src/lib/sunset-location.ts) (`readStoredLocation`, `writeStoredLocation`, `findLocationSlug`). No CustomEvents, no global event-bus.

**CommunityMap user-marker:**
A single golden ring + dot is rendered at `current.lat/lng` whenever the picked location falls inside the map BBOX (Europe view). For locations outside the BBOX (e.g. Tokyo via Nominatim search), no marker is rendered but the sunset widget still works. The marker is the only visual indicator of "this is the picked location" — there is no separate active-pin highlight on LOCATION pins.

**Location autocomplete input:**
The input under the clock searches via `GET /api/v1/geocode?q=…&limit=N` — a KV-cached proxy to Nominatim that hides the user's IP from OpenStreetMap (DSGVO). Picking any suggestion calls `handlePickLocation`, which runs `findLocationSlug(name)` against `LOCATIONS` so a typed match (e.g. "Frankfurt") highlights the corresponding congregation pin via the user-marker landing on it.

**4 Sabbath-aware states** (determined by `new Date().getDay()` + time of day):

| Condition | `label` | `timeVal` |
|---|---|---|
| Friday (dow=5), daytime | `t('untilSabbath')` | today's sunset |
| Saturday (dow=6) | `t('sabbathEnds')` | today's sunset |
| Any other day, daytime | `t('untilSunset')` | today's sunset |
| Any day, nighttime | `t('untilSunrise')` | tomorrow's sunrise |

**Responsive:** tablet (≤900px) — clock spans `grid-column: 1 / 3`, row layout with clock left + text right; mobile (≤600px) — all columns stack, clock column-spans full width.

**Fallback:** API fetch failure is silently swallowed; clock stays at `'–:––'` / `'…'` placeholder.

### ThemeScript + ThemeProvider

Theme handling is split across two components. Both must be present in every `[locale]/layout.tsx`.

**`ThemeScript`** — server component that renders a tiny synchronous inline `<script>` into `<head>`. Runs **before first paint** and applies `data-theme` to `<html>`. Reads (in order):
1. `?theme=dark|light` query param — set by cross-app links (see [Cross-subdomain theme persistence](#cross-subdomain-theme-persistence) below). Wins over storage.
2. `localStorage.sdarm-theme` — set when the user toggled in the current app.

If the URL carried `?theme=`, the script also writes it to `localStorage` and strips the param via `history.replaceState` so it doesn't litter the address bar.

**`ThemeProvider`** — `'use client'` component placed inside `<body>`. Listens for the `sdarm:toggle-theme` custom event (dispatched by the Navbar sun/moon button) and toggles `data-theme` on `<html>` + persists the new value to `localStorage`.

Together: `ThemeScript` handles the initial render (no flash), `ThemeProvider` handles runtime toggling. The toggle UI is the sun/moon icon in the Navbar — sun shows in dark theme, moon shows in light theme (icon swap is pure CSS, no React state, no hydration concern).

- Storage key: `sdarm-theme`, values `'dark'` | `'light'`.
- SSR default is `'dark'` — the common case for first-time visitors paints correctly with zero flash. `ThemeScript` only overrides when a visitor has explicitly stored `'light'`.
- `<html>` is rendered with `suppressHydrationWarning` because `ThemeScript` mutates `data-theme` before React hydrates, which would otherwise emit a hydration mismatch warning (same approach used by `next-themes`).
- Light theme overrides are defined in `packages/ui/src/styles/tokens.css` via the `[data-theme="light"]` selector.

```tsx
// app/layout.tsx (root)
import { ThemeScript } from '@sdarm/ui';
// ...
<html lang={locale} data-theme="dark" suppressHydrationWarning>
  <head>
    <ThemeScript />
  </head>
  <body>{children}</body>
</html>

// [locale]/layout.tsx
import { ThemeProvider } from '@sdarm/ui';
// ...
return (
  <>
    <ThemeProvider />
    {children}
  </>
);
```

The `data-theme="dark"` on `<html>` is the SSR default; `ThemeScript` overrides it inline before the browser paints anything if the user has stored `'light'` or arrived via a `?theme=` link.

#### Cross-subdomain theme persistence

`localStorage` is per-origin, so a value written on `sdarm.life` is invisible to `songs.sdarm.life`, `events.sdarm.life`, and `treasures.sdarm.life`. Cookies would solve this but are off-limits in this project (see [docs/dsgvo.md](dsgvo.md)). Instead, the theme rides along on the URL:

- `Navbar`, `Footer`, `NewsSection`, and `ScriptureVerseSection` all import `useCurrentTheme()` + `withTheme()` from `@sdarm/ui` and append `?theme=dark|light` to every cross-app `href`.
- The destination app's `ThemeScript` reads the param, persists it to `localStorage`, applies it to `<html>` before first paint, and strips it from the URL via `history.replaceState`.
- Result: the user toggles on `sdarm.life`, clicks "Songs", lands on `songs.sdarm.life` with the same theme — no flash, no extra round trips, no cookies.

When adding a new cross-app `<Link>` or `<a>`, **always** wrap the href in `withTheme(url, theme)` if the destination is a different subdomain.

### SEO and structured data (`apps/web`)

- **`app/sitemap.ts`** — dynamic `sitemap.xml` generated at request time. Fetches all published post slugs from the API and produces `sitemap` entries for both `de` and `en` locales.
- **`app/robots.ts`** — `robots.txt` that allows all crawlers and points to the sitemap.
- **`[locale]/layout.tsx`** — injects `Organization` and `WebSite` JSON-LD structured data via `<script type="application/ld+json">`.
- **Page-level metadata** — home, about, and post pages export `generateMetadata()` with `openGraph` image/title/description and `alternates.canonical` + `alternates.languages` (hreflang).
- **OpenGraph card images** — post (`apps/web`), book (`apps/treasures`), and song (`apps/songbook`) detail pages set `openGraph.images` to the generated card route `${API}/og?type=…&…&v={updatedAt}` (see [api.md](api.md)). The `v` param (content `updatedAt`) self-busts the KV cache on edits; the treasures DTO has no `updatedAt`, so its card relies on the 24 h KV TTL. Add `?v=` whenever a DTO exposes an update timestamp.

### Layout notes

- Never add `export const runtime = 'edge'` to any file — `@opennextjs/cloudflare` builds the entire app as a single Worker already on the edge runtime; per-file declarations cause the build to fail (see [gotchas.md](gotchas.md)).
- Root `layout.tsx` is an async server component. It imports CSS, calls `await getLocale()` from `next-intl/server`, and renders `<html lang={locale} data-theme="dark" suppressHydrationWarning>` with `<ThemeScript />` inside `<head>` and `<body>{children}</body>`. Next 16 requires `<html>` and `<body>` to live in the root layout — they cannot be deferred to a child layout (see [gotchas.md](gotchas.md)).
- `[locale]/layout.tsx` validates the locale, calls `setRequestLocale()`, and returns a fragment (no `<html>`/`<body>`) containing `<ThemeProvider />` and a `<NextIntlClientProvider>`. In `apps/web`, the provider wraps only `{children}` (JSON-LD `<script>` tags sit outside the provider); in `apps/events`, `apps/songbook`, and `apps/treasures`, the provider wraps `<ConnectedNavbar />`, `{children}`, and `<ConnectedFooter />`.
- All page files under `[locale]/` receive `params: Promise<{ locale: string }>` and call `setRequestLocale(locale)` at the top. Server components use `getTranslations()`, client components use `useTranslations()`.

---

## `apps/admin` component map

| Component | Notes |
|---|---|
| `AdminShell` | Owns mobile sidebar open/close state. Renders the `.sidebar-toggle` hamburger (mobile only, <768px), `<Sidebar>`, and the `.admin-main` content area. |
| `Sidebar` | Left nav (replaces the old top `AdminNav` bar). Links: Dashboard, Statistics, Posts, Songbooks, Treasures, Images, Subscribers, Email, Config, API Keys — active state via `usePathname()`. Footer profile menu holds the dark/light theme toggle (`localStorage: sdarm-admin-theme`). Collapses to an off-canvas panel with an overlay below 768px. |
| `ConfirmDialog` | Reusable confirm modal (title, message, confirm/cancel, `danger` variant). Escape-to-cancel, autofocuses Cancel. Reuses the existing `.modal-backdrop`/`.modal`/`.modal-title` classes. Wired into Songbooks/Songs delete; other domains still use the browser `confirm()`. |
| `Dashboard` | Renders at `/` (replaces the old redirect to `/config`). Hero stat card (posts published this month + `Sparkline`), a compact stats column (subscribers/songs/treasures/images), and "Latest posts"/"Latest subscribers" tables. All data composed client-side from existing endpoints via `domains/dashboard/repository.ts` — no new backend route. |
| `Sparkline` | Tiny presentational bar chart (`values: number[]`) rendered as inline SVG `<rect>`s — no charting dependency. Used by `Dashboard` for the monthly posts trend. |
| `BarChart` | Vertical monthly bar chart (inline SVG, value + month labels). Used by `Statistics`. |
| `HBarChart` | Horizontal bar rows (`{ label, value, detail? }[]`, plain divs). Used by `Statistics` for songs-per-book. |
| `Statistics` | Renders at `/statistics`. Four charts built client-side from existing endpoints via `domains/statistics/repository.ts` (signups/posts/uploads per month via the shared `lastMonthKeys`/`bucketByMonth` helpers in `lib/format.ts`, songs per book from `songCount`), plus two roadmap placeholder cards ("Top 10 songs", "Usage by language") with an info badge — those need the usage-tracking half of issue #109. Shares the `fetchAll` pagination helper in `lib/api.ts` with `Dashboard`. |
| `PostList` | Posts table, featured toggle, soft-delete. Paginated (20/page) |
| `PostForm` | Create/edit form with auto-slug. Uses `ImagePicker` for cover + thumb |
| `ImagePicker` | Unified upload + library picker |
| `ImageLibrary` | R2 image grid with usage info. Paginated (24/page), "Show unused only" filter |
| `EpubPicker` | Upload/replace/remove a self-hosted EPUB for a treasure (`treasures.epubKey`). Same upload-drop pattern as `ImagePicker` but no library grid — a book's EPUB isn't a shared asset the way an image is. Posts to `POST /admin/treasures/epub/upload`. Used by `TreasureForm` alongside the existing "EPUB URL" text input; `epubKey` wins when both are set (see [api.md](api.md)). |
| `ConfigEditor` | Config fields grouped by section. Uses `ImagePicker` for image keys. `bible_translations` is deliberately not rendered here — it is managed by `BibleSettings`. `home_grid` is likewise excluded — it has its own page. |
| `BibleSettings` | Renders at `/bible`. Curates which YouVersion translations are public: an ordered "enabled" list (reorder / remove), a copyright-jurisdiction selector, a read-only reference list of the licenses available to the app key, a paginated language-filtered browse of the YouVersion catalog, and a curated public-domain reference panel. Saves the chosen IDs as a JSON array through `PUT /admin/config/bible_translations`. Public-domain verdicts come from `domains/bible/publicDomain.ts`; the "Not licensed" badge comes from the catalog's `licensed` flag — there is deliberately **no** license-acceptance badge (see [api.md](api.md#bible-content)). |
| `HomeGridEditor` | Homepage grid settings — five blocks, per-locale text, images, and a live preview of the real site in an iframe |
| `SubscriberList` | Active subscribers table with Remove. Paginated (20/page) |
| `Pagination` | Shared offset-based pagination. Props: `page`, `total`, `limit`, `onChange` |

### Theme system (admin)

Unlike the public apps, the admin app has no `ThemeScript`/FOUC-prevention pass yet — `Sidebar` reads `localStorage.sdarm-admin-theme` in a `useEffect` and sets `data-theme` on `<html>` after mount (default `'dark'`).

The palette is **neutral slate surfaces + gold accents** (per `admin-mockup.html` and unlike the public site's warm black museum theme): dark = `#020617` page / `#0b1120` cards, light = `#f8fafc` page / white cards, hairline borders (`rgba(255,255,255,0.07)` dark / `rgba(2,6,23,0.08)` light), UI font Lexend, base radius `--r: 10px` (cards 12px). Accent tokens: `--accent` (`#c9a96e` dark / `#927223` light — deeper gold for contrast on white), `--accent-hover`, `--accent-soft`, `--on-accent`; `--gold` is kept as an alias of `--accent` so pre-existing rules follow it. `--brand-gold` (`#c9a96e`, theme-independent) exists only for the logo. Semantic tokens: `--ok`/`--ok-soft`, `--warn`/`--warn-soft`, `--red`/`--red-text`/`--danger-soft`, plus `--heading`, `--muted`, `--row-hover`, `--overlay`. Never hardcode colors in admin CSS — every rule goes through these tokens so both themes stay in sync.

### Songbooks card grid

`SongbookList` renders a responsive card grid (3/2/1 columns) instead of a table — `SongbookCard` shows the cover image (or a book-icon placeholder via `.book-cover-icon` when `coverKey` is null), language chip, song count, and always-visible Edit/Songs/Delete actions. A toolbar above the grid combines a title/slug search input with language filter chips (`.chip-filter`) and the "+ New songbook" action. Delete goes through `ConfirmDialog` instead of the browser `confirm()`.

### Pagination pattern

- `LIMIT` constant per component (20 for posts/subscribers, 24 for images)
- `page` state (1-based), `total` state from API
- Fetch: `?limit=LIMIT&offset=(page-1)*LIMIT`
- `<Pagination>` renders ← / → and `page / pages (total)`; returns `null` if only 1 page

### ImagePicker

`Props: { value: string | null; onChange: (key: string | null) => void }`

- Always shows drag-drop zone for uploading new images
- "⊞ Pick from library" toggle opens a scrollable grid of existing images
- Shows current image preview with "✕ Remove" overlay when a value is set
- On upload: `POST /admin/images/upload` → R2 + D1 → `onChange(key)`
- On library pick: `onChange(key)` + close library
- On remove: `onChange(null)`

### ImageLibrary

- Fetches from `GET /admin/images` (D1, not R2 directly)
- Shows key, size, upload date, usage (`Cover: Title`, `Thumb: Title`, `Config: key`, or "Unused")
- Usage shows first reference + "+N more" if multiple
- "Show unused only": adds `?unused=1`, resets to page 1
- Delete: `DELETE /admin/images?key=` (removes from R2 + D1)

### ConfigEditor sections

- **General:** `hero_bg_key`, `hero_bg_alt`, `donation_url`
- **About:** `about_text_1`, `about_text_2`, `about_image_key`, `about_image_alt`, `about_link_url`
- **Footer:** `facebook_url`, `whatsapp_url`, `instagram_url`, `youtube_url`

Image fields render `<ImagePicker>`. Text-area fields render `<textarea>`. URL and other fields render `<input>`.

---

## `apps/songbook` component map

| Component | Type | Notes |
|---|---|---|
| `SongView` | **Client** | Mode switcher rendered on every song detail page. Owns mode state and the display window ref. |
| `SongReader` | Client | Default reading view — parts list with optional chord display. |
| `Projector` | **Client** | Full-screen lyric display used in two contexts: inline fullscreen (portal over current window) and display window (`?projector=1`). Chrome (topbar/bottombar) auto-hides after 3 s of inactivity — mouse move or a tap reveals it; arrow keys and swipes are navigation gestures and leave it hidden. Display windows never hide chrome. |
| `ProjectorOnly` | Client | Thin wrapper rendered when `?projector=1` — passes `isDisplay` to `Projector` and closes the window on exit. |
| `PresenterDashboard` | **Client** | PowerPoint-style presenter view (portal over current window). Shows current + next slide previews, font controls, and navigation. Controls the display window via `BroadcastChannel`. |
| `SheetViewer` | Client | Sheet music viewer — thumbnail tabs + full image or PDF display. |
| `ChordLine` | Client | Renders a single lyric line with optional inline chord annotations (`[G]`, `[C]`, etc.). |

### SongView modes

`SongView` owns a `mode` state of type `'reader' | 'fullscreen' | 'presenter' | 'sheets'`.

| Mode | What renders | How triggered |
|---|---|---|
| `reader` | `SongReader` | Default; also returned to on close |
| `fullscreen` | `Projector` (inline portal, auto-enters fullscreen) | "Fullscreen" button |
| `presenter` | `PresenterDashboard` (portal) + display window opened | "Presenter" button (only shown when `window.screen.isExtended`) |
| `sheets` | `SheetViewer` | "Sheet music" button (only shown when `song.sheets.length > 0`) |

Closing presenter also closes the display window via the stored `displayWinRef`.

### Projector / PresenterDashboard — multi-window architecture

```
Main screen (presenter)              External screen (display window)
┌─────────────────────┐             ┌──────────────────────┐
│  PresenterDashboard │             │  Projector           │
│  (portal overlay)   │             │  (?projector=1)      │
│                     │──slide─────▶│                      │
│  [current preview]  │◀─────slide──│  full-screen lyrics  │
│  [next preview]     │──fontScale─▶│                      │
│  [⛶] [A−] [A+]     │──fullscreen▶│  [tap to fullscreen] │
│  [‹] 3/8 [›]        │             │                      │
└─────────────────────┘             └──────────────────────┘
         └────────────── BroadcastChannel('projector') ───────────────┘
```

**BroadcastChannel message types:**

| `type` | Direction | Payload | Effect |
|---|---|---|---|
| `ready` | display → presenter | — | Display finished loading; presenter re-pushes current slide + fontScale + slideTheme to sync |
| `slide` | bidirectional | `{ index: number }` | Navigate both sides to the same slide |
| `fontScale` | bidirectional | `{ value: number }` | Resize lyrics on the display; reflected in presenter header |
| `requestFullscreen` | presenter → display | — | Display shows a "tap to enter fullscreen" overlay; click on display triggers `requestFullscreen()` |
| `slideTheme` | bidirectional | `{ value: 'dark' \| 'light' }` | Sync the slide color theme (☀/☾ toggle, `data-slide-theme` + `--proj-*` CSS tokens). The mount render never broadcasts — a fresh display window must not clobber the presenter's choice with its default. Initial state defaults to the current site theme (`getSiteTheme()` in `lib/format.ts`, reads `data-theme` off `<html>`), not always `'dark'` |

**Connecting overlay:** `PresenterDashboard` shows a pulsing dots overlay until the first `ready` message arrives. The fullscreen button is disabled until connected. This covers the ~10 s cold-start time for the display window to load Next.js.

**Fullscreen constraint:** `requestFullscreen()` requires a user gesture in that window. A BroadcastChannel message does not qualify. The display therefore renders a click-to-fullscreen overlay (`projector__fs-overlay`) when it receives `requestFullscreen`; clicking it provides the required gesture.

**Font controls:** In display mode (`isDisplay=true`), the `Projector` A−/A+ buttons are hidden — the presenter dashboard owns font size. Both sides still sync fontScale bidirectionally via the channel.

---

## `apps/treasures` component map

| Component | Type | Notes |
|---|---|---|
| `TreasureCatalog` | **Client** | Catalog page — `PageHero` + scripture quote + filter bar + paginated grid of `TreasureCard`s. Owns category/language filter state and pagination. Page size is 8 (2 rows × 4 cols on desktop). The hero carries the book-request button alone (`.br-hero-ctas`); the Bible and the lesson are entered from two `SectionCard`s pinned at the head of the grid instead of from a ghost link above the shelf. |
| `TreasureCard` | **Client** | One book entry: `Book3DCover` on the visual side, title row + author + description + price/free badge on the body side. Always links to `/{locale}/books/{id}` — Bibles are not treasures and never appear in this grid. |
| `SectionCard` | **Client** | The two rooms of this app — the Bible and the Sabbath Bible Lesson — standing in the shelf as cards. Same shape, shelf and reveal as a `TreasureCard`, with a paper tint and a drawn mark instead of a cover, because the shelf is where a reader looks for something to read. Pinned ahead of the books and outside the filters and the paging: a section has no language or price to filter by and must not fall onto page three. Copy comes from `treasures.sections.{bible,sbl}.{title,description}`. |
| `Book3DCover` | **Client** | Perspective-tilted 3D book rendering with drop shadow. Renders a face image when one is available, otherwise a museum-tone gradient fallback with a glyph + title. |
| `TreasuresFilterBar` | Client | Category + language filter chips. Emits `onChange`. |
| `BookRequestModal` | Client | Free-book delivery request form. Posts to `POST /api/v1/book-request`. |
| `bible/BibleBookIndex` | Client | Book list of a translation: passage picker + OT/NT tab filter + book link grid. |
| `bible/BiblePassagePicker` | **Client** | Reactive passage search (combobox). Understands `Book`, `Book N`, `Book N:V`, and bare numbers (`60` → only books with ≥60 chapters). Fuzzy book matching over localized name/abbreviation/USFM code. |
| `bible/BibleChapterReader` | **Client** | Default chapter view. Verse click-selection (click / Shift-range / Cmd-toggle), copy-to-clipboard with a persisted options panel (`lib/copyVerses.ts`), share link, font scale (localStorage), keyboard nav (←/→ chapters, j/k verses, g picker), presenter launch, and the publisher copyright notice (`.bible-copyright`). |
| `bible/BibleParallelReader` | **Client** | Two-column side-by-side view (`?compare=` URL param). Verses aligned by number; Psalm chapters remapped LXX↔Hebrew via `@sdarm/types` using each translation's `lxxPsalms` flag. A/B translation selects, swap, presenter launch. |
| `bible/BiblePresenterDashboard` | **Client** | Operator view (portal): verse strip + scaled 1280×720 mirror of the display, passage picker, primary/compare translation selects, font controls, blank-screen toggle (`b`), keyboard verse navigation with Shift-range extension. Controls the display window via `BroadcastChannel('bible-projector')`. |
| `bible/BibleProjector` | **Client** | Full-screen verse display. Inline fullscreen or display window (`?projector=1`, `isDisplay`). Receives `selection`/`fontScale`/`blank`/`passage`/`requestFullscreen` channel messages; sends `ready` on load. Renders single or parallel layout. |
| `bible/BibleProjectorOnly` | Client | Thin wrapper for `?projector=1` — mounts `BibleProjector` with `isDisplay` and closes the window on exit. |
| `bible/ContinueReadingBar` | Client | "Continue reading" banner on the Bible landing page, driven by `localStorage` last-read (read after mount to avoid hydration mismatch). |
| `bible/BibleUnavailable` | Client | Friendly error state when a chapter fetch fails (retry / back links). |

### Book3DCover

Renders a book as a perspective-rotated figure with three stacked elements — a side `tome-edge` (page block), a top `tome-bind` (binding strip), and the front `tome-face` (cover image or gradient placeholder). The depth of the page block scales with the book's known page count so a thick book reads visibly thicker than a slim one.

**Props:**

| Prop | Type | Notes |
|---|---|---|
| `src` | `string \| null` | Cover image URL. If `null`, the `tome-face--blank` variant renders with a glyph and the title text. |
| `alt` | `string` | Alt text for the `<img>` when `src` is set. |
| `title` | `string?` | Used for (a) the deterministic fallback hue picker, (b) the page-count → depth lookup, (c) the visible label on blank covers. |
| `accentColor` | `string?` | Overrides the spine colour (`--tome-spine`) for books with a brand colour configured in the DB. |
| `gradient` | `string?` | Overrides the front-face gradient (`--tome-skin`) when no cover image is uploaded. |

**Depth model:** `BOOK_PAGES` maps known EGW titles (DE / EN / RU editions) to page counts. Page count is mapped to pixel depth via a linear scale (96 → 12 px, 835 → 24 px, clamped). Unknown titles fall back to a hash-derived value in the 14–20 px range so depth is stable across renders without being uniform.

**Fallback hues:** Six museum-tone palettes are picked deterministically by hashing the title — same book → same hue every render and on every breakpoint.

### Cover source

`TreasureCard` resolves the cover image solely from `treasure.coverKey`:

- `coverKey` set → `r2url(coverKey, { w: 200, q: 85 })` (Cloudflare Image Transformations in production, raw R2 in local dev).
- `coverKey` null → `Book3DCover` renders the blank `tome-face--blank` variant (gradient + glyph + title).

No external image hosts are contacted from the catalog. Covers are uploaded through Admin → Treasures → Edit → Cover image (the same `<ImagePicker>` used by posts), which stores the file under `uploads/<uuid>.<ext>` in R2 and tracks it in the `images` D1 table.

### TreasureCatalog layout

`PageHero` (book SVG decoration) → `ScriptureQuote` → `TreasuresFilterBar` → 4-column grid of `TreasureCard`s (2 cols on tablet, 1 col on mobile) → pagination (`pageRange()` with ellipses when more than 7 pages). Cards stagger in via the `.visible` class on `.item-card` (55 ms × index, capped at the first 20 cards).

### Bible reader (`/[locale]/bible/...`)

Route structure (all server components fetching via `lib/bible.ts`, silent-error style). `bible/layout.tsx` adds `<ConnectedFooter>` — the section sits outside the `(main)` route group, which is where the footer otherwise lives, and would render without one:

| Route | Renders |
|---|---|
| `/bible` | `PageHero` + `ContinueReadingBar` + a card per enabled translation (language chip, name, abbreviation, year, copyright). Shows an empty-state message when the operator has enabled none. |
| `/bible/[code]` | `PageHero` + `BibleBookIndex` |
| `/bible/[code]/[book]` | Chapter number grid |
| `/bible/[code]/[book]/[chapter]` | `BibleChapterReader`; `?compare=X` → `BibleParallelReader`; `?projector=1` → `BibleProjectorOnly` (display window). JSON-LD `Article` + `generateMetadata` with canonical/hreflang. |

**Multi-window presenter** mirrors the songbook architecture (`BroadcastChannel`, `ready` handshake, click-to-fullscreen overlay on the display) — channel name `bible-projector`, selection is a verse **set** (single / contiguous range / Cmd-toggled) instead of a slide index. The presenter can also switch the display into parallel mode at runtime; the display window then reloads with `?compare=`.

**Data source:** everything comes from our own `/api/v1/bible/*`, which proxies YouVersion server-side (see [api.md](api.md#bible-content)). The browser never talks to YouVersion, and translation availability is controlled by the operator in Admin → Bible.

**URL codes** are YouVersion abbreviation slugs (`/bible/delut/JHN/3`), and book codes are USFM (`JHN`, not `JOH`). The API also accepts the raw numeric YouVersion ID in place of the slug.

**Data flow note:** `lib/bible.ts` fetchers run on the server (`API` env). `fetchParallelChapter` is additionally called from `BibleChapterReader` (client) when the operator picks a compare translation in the presenter — the chapter page threads `apiUrl={API}` down as a prop for that.

**Copyright:** `chapter.translation.copyright` is rendered under the text and under both parallel columns. Several YouVersion per-Bible licenses require the notice — do not remove it.

**Client-side persistence** (functional localStorage, no identifiers — DSGVO-fine): `bible_last_read`, `bible_font_scale`, `bible_copy_options`.

### Sabbath Bible Lesson (`/[locale]/sbl`)

The weekly Sabbath Bible Lesson in the printed booklet's own layout, ported from
the standalone SBL Edition page into this app. It is a route of `apps/treasures`
like the Bible reader is, reached from a `SectionCard` at the head of the
catalogue.

| File | Type | Notes |
|---|---|---|
| `app/[locale]/sbl/page.tsx` | Server | `<div className="sbl">` around `<SblApp>`. Reads `API_URL` and hands it down; `generateMetadata` from `treasures.sections.sbl` with canonical + hreflang; `dynamic = 'force-dynamic'`. **No navbar of its own** — `[locale]/layout.tsx` already renders one, and a second put two `<nav aria-label="Hauptnavigation">` landmarks on the page, invisible on screen because they stack exactly and caught by the axe check. |
| `app/[locale]/sbl/layout.tsx` | Server | The only importer of `app/styles/sbl/index.css`. No `<ConnectedFooter>`: the catalogue and the Bible are browsing surfaces and carry the site footer, the lesson is a document that ends in a colophon of its own, exactly where the printed booklet ends. |
| `components/sbl/SblApp.tsx` | **Client** | The sheet's markup as static JSX, plus a `useEffect` that measures the navbar, calls `initSbl({ apiUrl })` and registers the service worker. The effect's cleanup calls the teardown `initSbl` returns. The colophon is empty markup with ids — the engine paints it in the lesson's language. |
| `lib/sbl/engine.ts` | — | ~4400 lines: lesson rendering, settings, calendar, PDF, and the marker/notes subsystem. |
| `lib/sbl/api.ts` | — | The two proxy URLs (`/sbl/quarter/…`, `/sbl/bible/…`). |
| `lib/sbl/types.ts` | — | The shapes `app.sdarm.org` serves, and what the pencil stores. |
| `lib/sbl/index.ts` | — | Re-exports `initSbl`. |
| `app/styles/sbl/base.css` | — | Also holds the `[role='button']:focus-visible` ring the ported `<div>` controls have no focus affordance of their own. |

**The locale in the URL is the site's, not the lesson's.** It governs the
navigation and nothing else; the lesson's own language (`de` · `en` · `ru`) is a
setting of the sheet in `localStorage` — see
[conventions.md](conventions.md#appstreasures) for why the two are deliberately
not tied.

**Why the engine is one imperative module and not a React tree.** The lesson
body, the marks and the reader's own notes are DOM built and edited through
`Range`/`Selection`/`TreeWalker` — that is what lets one stroke start mid-word in
one paragraph and end in another, survive a re-render, and print *with* the text
instead of floating over it. Marks are stored as character offsets inside a
block, counted over its text nodes. Rebuilding that as React state would be a
rewrite of the part with the most behaviour in it, for no gain. So React owns the
shell and the engine owns what stands inside it.

**`initSbl()` returns its own teardown, and that is not optional.** The engine
binds to `document` and `window` and writes classes and custom properties onto
`<html>` and `<body>`; none of that is inside the sheet, so none of it leaves
with the React tree. `SblApp`'s effect cleanup calls the returned function,
which unbinds everything registered through the engine's `on()` helper,
disconnects the controls observer, drops `--gray-dk` · `--gray` · `--box` ·
`--sbl-credit` · `--z` · `--barh` · `--railw`, removes the `paper*` classes and
the `loading` · `dualview` · `railon` · `writing` · `railcall` · `railout` ·
`bare` body classes, and puts `<html lang>` back to the site's.

⚠️ This replaced a module-level `started` flag that was set once for the
lifetime of the module. It stopped the StrictMode double-mount, and it also
stopped the *second visit*: this is a route in an app, the catalogue links to it
with `<Link>`, and a reader who went back and returned got fresh DOM with no
engine over it — an empty sheet showing the `…` placeholder until they reloaded
by hand. The module still keeps a reference to the live instance and tears the
previous one down before starting a new one, so there can never be two engines
over one sheet.

**The sheet is operable by keyboard, and that is bolted on rather than built
in.** Every control in the ported markup is a `<div>` with an `onclick`.
`paintControls()` in the engine gives each one `role="button"` and a tab stop,
mirrors the `title` the engine already paints into `aria-label` (a title alone
is not announced by every reader, and it changes with the lesson's language), and
one `keydown` handler turns Enter and Space into the click those handlers already
listen for. A `MutationObserver` over `.bar` · `#rail` · `.days` · `#fmtbar` ·
`#bub` repaints what is rebuilt — the language strip, the swatches, the calendar
and the day strip are all `innerHTML`. `#sheets` is deliberately *not* observed:
it holds the lesson and can be a whole quarter deep while a PDF is being built.
The focus ring lives in `styles/sbl/base.css` under `[role='button']:focus-visible`.

The two-dimensional colour pickers (`.area`, `.hue`, `.huebar`) are left out on
purpose — they are drags, and the keyboard equivalent is a slider with its own
semantics. The preset swatches beside them carry the same tints and are
reachable, so nothing is available by drag alone.

**The navbar's height is measured, not assumed.** The sheet's own bar has to sit
under the site navigation, and that height is not a constant: `--nav-h` in
`globals.css` is an arithmetic guess that already reads 67px against the 78px the
navbar renders, and it would drift again the next time the nav changed. `SblApp`
measures `nav.site-nav` into `--sbl-nav-h` on mount and on every resize, so the
two bars cannot overlap.

**Styles are the original stylesheet, split by section and scoped under `.sbl`**
(`app/styles/sbl/` — `base · toolbar · sheet · marker · rail · days · overlays ·
print · shell`, imported in that order by `index.css`, which is imported only by
`app/[locale]/sbl/layout.tsx`). The order is the cascade; do not reorder it. The
scoping is not cosmetic: Next keeps a visited route's CSS in the document, so an
unscoped rule here would repaint the catalogue the moment a reader came back from
a lesson — and the two designs are strangers, white paper in PT Serif against the
dark museum theme in Cormorant. Unscoping the selectors reproduces the original
stylesheet exactly, which is what keeps the port auditable against its source.

**`:root` stays global, and must.** The engine writes `--z`, `--barh`, `--railw`,
`--gray-dk` and the rest onto `<html>` at runtime; a copy of those names on the
`.sbl` wrapper would win over what it wrote. The two names the site already owns
are renamed the other way round instead — `--gold` → `--sbl-gold`, `--muted` →
`--sbl-muted`.

**Fonts are PT Serif / PT Sans self-hosted through `@fontsource`** (imported at
the top of `styles/sbl/index.css`), not Google Fonts — same faces, Cyrillic
subsets included, no third-party request ([dsgvo.md](dsgvo.md)).

**Offline** is `public/sbl-sw.js`, registered with scope `/`. The broad scope is
deliberate — the lesson lives at `/{locale}/sbl` and a worker parked deeper could
never control it — and the `fetch` handler is what keeps the rest of the app out
of its way: it answers only `/api/v1/sbl/bible/*` (cache-first, an edition never
changes), `/api/v1/sbl/quarter/*` (stale-while-revalidate), `/_next/static/*`
(cache-first, the URL changes when the file does) and navigations matching
`/{any two-letter locale}/sbl` (network-first with a cache fallback). Everything
else falls through with no `respondWith` at all, so the catalogue and the Bible
behave exactly as they did before. The locale is matched as `[a-z]{2}` rather
than as a list of the two that exist today: the list would live in a file nobody
thinks to grep, and a third locale would lose offline support silently.

**Every box is capped, and it has to be.** The four caches — `sbl-shell` ·
`sbl-assets` · `sbl-quarters` · `sbl-bibles` — are trimmed on write, oldest
first, at 8 / 160 / 24 / 6 entries (the Cache API returns keys in insertion
order). The worker file itself does not change between deploys, so `activate` —
the only place a cache can be dropped wholesale — fires about once in the life of
an installation, while every deploy adds a fresh set of hashed chunks on top of
the last. Uncapped, that is a cache on a reader's device that only ever grows.
The editions are the reason the `sbl-bibles` cap is in single figures: one is
four megabytes.

The lesson opens with no connection **from the second visit on**, not the first.
`install` can only precache the shell entry — the rest is a set of hashed chunks
whose names the worker cannot know in advance, and the first visit's subresources
are already in flight before the worker controls the page. They are cached on the
next controlled load. Verified by loading the sheet, reloading, cutting the
network and reloading again: title, day bands and all verse boxes render from
cache.

---

## `@sdarm/ui` shared components

All public-facing apps (`web`, `songbook`, `treasures`, `events`) import from `@sdarm/ui`. **Check here before building something from scratch** — the hero, footer, nav, and quote band are already done.

Import the design system once in the root layout:

```ts
import '@sdarm/ui/src/styles/index.css';
```

### Component reference

| Component | Import | Notes |
|---|---|---|
| `ThemeScript` | `@sdarm/ui` | Server component. Renders a synchronous inline `<script>` inside `<head>` that reads `localStorage.sdarm-theme` and applies `data-theme` to `<html>` before first paint. Prevents FOUC. |
| `ThemeProvider` | `@sdarm/ui` | Client component. Place inside `<body>` once per `[locale]/layout.tsx`. Listens for `sdarm:toggle-theme` and toggles `data-theme` on `<html>`. Persists to `localStorage`. No visible output. |
| `ConnectedNavbar` | `@sdarm/ui` | Server component. Pass `locale` prop. Reads nav translations internally. Use in every locale layout. |
| `ConnectedFooter` | `@sdarm/ui` | Server component. Pass `locale` prop. Reads footer translations + `apiUrl` from env internally. Use in every locale layout. |
| `PageHero` | `@sdarm/ui` | Full-bleed dark landing hero. Pass `title` (ReactNode), `eyebrow?`, `subtitle?`, `decoration?` (SVG), `scrollHint?`. Already has grain, fog, deco-circle, entrance animations — **do not re-implement these**. |
| `ScriptureVerseSection` | `@sdarm/ui` | Centered italic quote band. Pass `text` and `reference`. |
| `ComingSoon` | `@sdarm/ui` | Placeholder for unreleased pages. Pass `title` and `subtitle`. |
| `Pagination` | `@sdarm/ui` | Generic offset pagination. Consumers provide their own CSS. |

### When to use `PageHero`

Any public landing page that needs a dark hero with ambient atmosphere should use `PageHero` rather than building its own. The `decoration` prop accepts any ReactNode — pass an SVG that represents the page's domain (music note for songbook, book for treasures, etc.). The SVG is rendered at 120×120 with 12% opacity on the right side.

```tsx
// songbook example
<PageHero
  eyebrow={t('eyebrow')}
  title={t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
  subtitle={t('subtitle')}
  decoration={<svg viewBox="0 0 100 130">…</svg>}
  scrollHint={t('discover')}
/>
```

The `<em>` inside `title` renders in `--gold` italic. Use `t.rich()` with `{ em: (chunks) => <em>{chunks}</em> }` to drive it from i18n.

---

## Next.js component rules

**Default to Server Components.** Add `'use client'` only when you need browser APIs, event handlers, or `useState`/`useEffect`.

**Client components cannot read server-only env vars** (`API_URL`, `R2_URL`). Pass them as props from the parent server component.

**Internal links always use `<Link>`.** Plain `<a href>` triggers a full page reload — use `next/link` for SPA navigation.

---

## Data flow (`apps/web`)

**Fetch at the page level, map to component types, pass down as props.** Sections do not fetch independently.

**Mapper functions** (`toNewsPost`, `toFooterConfig`, etc.) convert `PostDto` shapes into component-specific types. If used by one page only, they live in that page file. If used by two or more pages, move to `lib/api.ts`. Keep them pure.

**Fetch errors are silent.** Fetchers return `null` on any error; components render a static fallback. Do not propagate fetch errors to the UI.

---

## Images

All images use Next.js `<Image fill>` inside aspect-ratio containers. `next.config.ts` `remotePatterns`: `images.unsplash.com`, `upload.wikimedia.org`, `images.sdarm.life` (https), `localhost` (http).

`unoptimized` is set only on static fallback Wikimedia/Unsplash URLs — not on R2-hosted images.

### Cloudflare Image Transformations

R2 images are served through Cloudflare Image Transformations in production. `r2url()` in both `apps/web` and `apps/songbook` accepts an optional `ImageTransform` parameter (`{ w?, h?, q? }`) and produces `/cdn-cgi/image/w=...,f=auto,q=80/{key}` URLs.

**Behaviour by environment:**
- **Production** (`R2` points to `images.sdarm.life`): transforms are applied, serving WebP/AVIF automatically via `f=auto`
- **Local dev** (`R2` includes `localhost`): transforms are skipped — `/cdn-cgi/image/` is not supported locally

**Transform sizes used across call sites:**

| Context | Transform |
|---|---|
| Post detail cover | `w: 1200, q: 85` |
| News cards | `w: 600, h: 400` |
| Related post cards | `w: 400, h: 300` |
| About page image | `w: 800` |
| Songbook sheet images | `w: 1200, q: 90` |
| Songbook sheet PDFs | no transform |

**Kill switch:** Set `R2_TRANSFORMS=false` env var to disable transforms and serve raw R2 URLs. Only needed if Image Transformations is disabled at the Cloudflare account level (which would cause `/cdn-cgi/image/` to return 403).

**Do not transform external URLs.** `FALLBACK_IMG` (Unsplash) and other external URLs are never passed through `r2url()` with transforms — they use their own query-string sizing.

After upload, use `URL.createObjectURL(file)` for preview. Do not switch to the R2 URL — wrangler local state is not served at `images.sdarm.life`. The R2 key is stored correctly regardless.

Direct R2 operations (wrangler, CF dashboard) bypass the `images` table. Any upload/delete outside the admin API requires a manual backfill (`POST /admin/images/backfill`).


### HomeGridEditor (`apps/admin`)

Settings panel on the left, preview on the right. Route `/home-grid`, domain folder `app/domains/home-grid/`.

**Per block:** show/hide · clickable · link (empty = built-in destination) · open in new tab · show label · show button · label / headline / button text per locale · image with crop, scrim strength and text colour.

The section has no heading of its own — the five cards carry it. There is no eyebrow or title to configure.

**Preview is the real site.** Each pane is an `<iframe>` of `${NEXT_PUBLIC_WEB_URL}/{locale}?gridPreview=1&theme=…`, and the draft config goes in over `postMessage` on every keystroke. Rebuilding the card inside the admin would mean two implementations and a preview that lies the first time either changes. Theme (dark / light / both side by side), locale and width (desktop / tablet / mobile) are switchable; the iframe renders at its true width and is scaled with a transform, because resizing it would trip a different media query and preview the wrong layout.

**Frame sizes are real devices** — 1280×900, 900×1180, 390×844. The mobile frame was once 1900px tall, which is no phone that exists; every `vh` rule on the page resolved against it and the preview showed a hero nobody would ever get. A preview with an invented viewport previews an invented layout.

**Auto text colour.** `measureLuminance()` reads the mean Rec. 709 luma of the lower third of the file **in the admin, before upload** — that region is what sits behind the card's text. The number is stored with the config, so the site paints the right colour on first render. Sampling on the public site would need cross-origin pixel access and would repaint the text after the photo loads, a visible flash on every visit. Images picked from the library instead of uploaded have no measurement; `auto` then falls back to light text and the editor can set it by hand.

**Env:** `NEXT_PUBLIC_WEB_URL` — the site the preview iframe points at. Browser-exposed by necessity; it is a public URL.
