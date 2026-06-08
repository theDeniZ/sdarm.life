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
| `NewsSection` | **Client** | Static illustrated masonry grid — live news posts + static faith/event cards. Wired to API for news and latest video post. |
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
- Badge line (decorative dot + translated eyebrow text)
- `<h1>` with gold italic accent via `t.rich()` and `<em>`
- Subtitle paragraph
- `<Link>` CTA button pointing to `/{locale}/about`

**i18n namespace:** `web.heroWelcome` (keys: `badge`, `title`, `subtitle`, `cta`).

**CSS class prefix:** `hero-welcome-*` — all classes are defined in `apps/web/app/globals.css`: `hero-welcome`, `hero-welcome-bg`, `hero-welcome-planet`, `hero-welcome-grain`, `hero-welcome-content`, `hero-welcome-badge`, `hero-welcome-badge-dot`, `hero-welcome-title`, `hero-welcome-sub`, `hero-welcome-cta`, `hero-welcome-cta-label`.

### NewsSection masonry gallery

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

### Layout notes

- Never add `export const runtime = 'edge'` to any file — `@opennextjs/cloudflare` builds the entire app as a single Worker already on the edge runtime; per-file declarations cause the build to fail (see [gotchas.md](gotchas.md)).
- Root `layout.tsx` is an async server component. It imports CSS, calls `await getLocale()` from `next-intl/server`, and renders `<html lang={locale} data-theme="dark" suppressHydrationWarning>` with `<ThemeScript />` inside `<head>` and `<body>{children}</body>`. Next 16 requires `<html>` and `<body>` to live in the root layout — they cannot be deferred to a child layout (see [gotchas.md](gotchas.md)).
- `[locale]/layout.tsx` validates the locale, calls `setRequestLocale()`, and returns a fragment (no `<html>`/`<body>`) containing `<ThemeProvider />` and a `<NextIntlClientProvider>`. In `apps/web`, the provider wraps only `{children}` (JSON-LD `<script>` tags sit outside the provider); in `apps/events`, `apps/songbook`, and `apps/treasures`, the provider wraps `<ConnectedNavbar />`, `{children}`, and `<ConnectedFooter />`.
- All page files under `[locale]/` receive `params: Promise<{ locale: string }>` and call `setRequestLocale(locale)` at the top. Server components use `getTranslations()`, client components use `useTranslations()`.

---

## `apps/admin` component map

| Component | Notes |
|---|---|
| `AdminShell` | Sidebar + main layout wrapper |
| `Sidebar` | Nav links, active route via `usePathname()`. Links: Posts, Images, Config, Subscribers |
| `PostList` | Posts table, featured toggle, soft-delete. Paginated (20/page) |
| `PostForm` | Create/edit form with auto-slug. Uses `ImagePicker` for cover + thumb |
| `ImagePicker` | Unified upload + library picker |
| `ImageLibrary` | R2 image grid with usage info. Paginated (24/page), "Show unused only" filter |
| `ConfigEditor` | Config fields grouped by section. Uses `ImagePicker` for image keys |
| `SubscriberList` | Active subscribers table with Remove. Paginated (20/page) |
| `Pagination` | Shared offset-based pagination. Props: `page`, `total`, `limit`, `onChange` |

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
| `Projector` | **Client** | Full-screen lyric display used in two contexts: inline fullscreen (portal over current window) and display window (`?projector=1`). |
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
| `ready` | display → presenter | — | Display finished loading; presenter re-pushes current slide + fontScale to sync |
| `slide` | bidirectional | `{ index: number }` | Navigate both sides to the same slide |
| `fontScale` | bidirectional | `{ value: number }` | Resize lyrics on the display; reflected in presenter header |
| `requestFullscreen` | presenter → display | — | Display shows a "tap to enter fullscreen" overlay; click on display triggers `requestFullscreen()` |

**Connecting overlay:** `PresenterDashboard` shows a pulsing dots overlay until the first `ready` message arrives. The fullscreen button is disabled until connected. This covers the ~10 s cold-start time for the display window to load Next.js.

**Fullscreen constraint:** `requestFullscreen()` requires a user gesture in that window. A BroadcastChannel message does not qualify. The display therefore renders a click-to-fullscreen overlay (`projector__fs-overlay`) when it receives `requestFullscreen`; clicking it provides the required gesture.

**Font controls:** In display mode (`isDisplay=true`), the `Projector` A−/A+ buttons are hidden — the presenter dashboard owns font size. Both sides still sync fontScale bidirectionally via the channel.

---

## `apps/treasures` component map

| Component | Type | Notes |
|---|---|---|
| `TreasureCatalog` | **Client** | Catalog page — `PageHero` + scripture quote + filter bar + paginated grid of `TreasureCard`s. Owns category/language filter state and pagination. Page size is 8 (2 rows × 4 cols on desktop). |
| `TreasureCard` | **Client** | One book entry: `Book3DCover` on the visual side, title row + author + description + price/free badge on the body side. Always links to `/{locale}/books/{id}` — epub books open the reader, non-epub books open `BookDetail`. |
| `Book3DCover` | **Client** | Perspective-tilted 3D book rendering with drop shadow. Renders a face image when one is available, otherwise a museum-tone gradient fallback with a glyph + title. |
| `TreasuresFilterBar` | Client | Category + language filter chips. Emits `onChange`. |
| `BookRequestModal` | Client | Free-book delivery request form. Posts to `POST /api/v1/book-request`. |

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

---

## `apps/treasures` Bible reader

The Bible reader lives inside the Treasures app. Routes:

- `/{locale}/bible` — translation list
- `/{locale}/bible/{code}` — book index for a translation
- `/{locale}/bible/{code}/{book}` — chapter grid
- `/{locale}/bible/{code}/{book}/{chapter}` — chapter reader (`?compare=` for inline parallel, `?projector=1` for the display window)

| Component | Type | Notes |
|---|---|---|
| `BibleChapterReader` | **Client** | Default reader; owns presenter open/close, comparison state, `g`-key opens the picker sheet, `j/k` step verses |
| `BibleParallelReader` | Client | Inline two-column reader (used when `?compare=` set) |
| `BibleBookIndex` | Client | OT/NT browse grid; embeds `BiblePassagePicker` as the primary search |
| `BiblePassagePicker` | Client | Smart input — typing `60` lists books with ≥60 chapters; `John 3` jumps to John 3; `John 3:16` jumps to verse 16; pure book names match name/abbreviation/USFM code with diacritic-insensitive normalisation |
| `BiblePresenterDashboard` | **Client** | Operator panel (portal). Verse strip on the left (click → set verse, shift-click → extend passage), preview on the right. Hosts the passage picker, "Compare with…" select, font controls, blank-screen toggle, fullscreen-request button |
| `BibleProjector` | Client | Display surface — renders the **whole chapter** as a vertical list; the active range is highlighted and auto-scrolls into view. Single mode = one column; parallel mode = CSS-grid `auto 1fr 1fr` so verse rows stay aligned even when the two translations have very different lengths |
| `BibleProjectorOnly` | Client | Wrapper rendered when `?projector=1`; passes `isDisplay` and optional `parallel` data to `BibleProjector` |
| `BibleUnavailable` | Client | Rendered server-side when translation+book exist but the chapter (or parallel chapter) failed to load — i.e. upstream + D1 fallback both unavailable. Shows a friendly message and a Retry button (`window.location.reload()`). |
| `ContinueReadingBar` | Client | localStorage `bible_last_read` resume link |

### Presenter — multi-window architecture (current contract)

```
Main screen (operator)               External screen (display)
┌─────────────────────────┐          ┌──────────────────────────────┐
│  BiblePresenterDashboard│          │  BibleProjector (?projector=1)│
│  ─────────────────────  │          │                                │
│  [PassagePicker]        │          │  v.10  …                       │
│  v.1 │ Im Anfang…       │──range──▶│  v.11  Im Anfang schuf  ←──┐  │
│  v.2 │ Und die Erde…    │◀──range──│  v.12  …                    │  │
│  …                      │──font───▶│                              │  │
│  [Compare ▼] [▢ Blank]  │──blank──▶│  (black overlay if blanked)  │  │
│  [⛶] [A−][A+] [×]      │──passage▶│  (navigate via window.location)│  │
└─────────────────────────┘          └──────────────────────────────┘
         └────────── BroadcastChannel('bible-projector') ────────────┘
```

**Channel message types:**

| `type` | Direction | Payload | Effect |
|---|---|---|---|
| `ready` | display → operator | — | Display loaded; operator re-pushes `range`, `fontScale`, `blank` for fresh sync |
| `range` | bidirectional | `{ from: number; to: number }` | Highlight verse `from`..`to` on both sides; display auto-scrolls so `from` sits near the top |
| `fontScale` | bidirectional | `{ value: number }` | Resize verse text on display; reflected in operator header |
| `blank` | operator → display | `{ on: boolean }` | Black overlay covers display content; toggled by `b` key or button |
| `requestFullscreen` | operator → display | — | Display shows a tap-to-fullscreen overlay (browser requires a gesture) |
| `passage` | operator → display | `{ locale, translationCode, bookCode, chapter, compare }` | Display navigates via `window.location.assign()` to the new chapter (and optional parallel partner) |

**Range selection:** Click a verse in the strip to set both `from` and `to` to that verse (single highlight). Shift-click to extend `to` to a later verse (passage range). Arrow keys step the single verse; Shift+Arrow extends the range. `b` toggles blank screen.

**Parallel mode:** Operator picks a comparison translation from the "Compare with…" select. Operator window calls `/bible/parallel?a=&b=&book=&chapter=` and the dashboard preview renders both columns. The display window is reloaded with `?compare={code}` so its projector page server-side fetches the parallel data and renders the aligned grid. Per-side Psalm chapter remapping is preserved by the API (`parallel.a.chapter` / `parallel.b.chapter`).

**Smart picker (`BiblePassagePicker`):** Parses these inputs in order:
1. Pure number `N` — list books with `chapterCount >= N`, deep-linking to chapter N
2. `Book N:V` or `Book N` — fuzzy-match the book fragment, jump to chapter N (and verse V via `#v` anchor)
3. Plain text — fuzzy-match book name/abbreviation/USFM code

All matches are diacritic-insensitive (NFD normalisation) so `пс` matches "Псалтирь" and `mose` matches "1. Mose".

A visually-hidden `aria-live="polite"` status node announces the result count (or "no matches") whenever the query changes — required for screen-reader parity with the visual dropdown.

**Presenter button availability:** the "Presenter" action is always shown on the chapter reader. `window.screen.isExtended` (when supported) is used only to decide the `title` hint — when no second screen is detected, the hint says the window will open separately for manual placement on a beamer. Browsers without the API still get the button.

**Transient error UI:** chapter and parallel-chapter pages distinguish three outcomes server-side:
- Translation, book, or out-of-range chapter → `notFound()` (renders `not-found.tsx`)
- Translation+book exist, chapter in-range, but fetch returned `null` → renders `BibleUnavailable` with a Retry button
- Otherwise → normal reader

This catches the rare case where the upstream Bible provider is down AND the translation isn't one of the 3 baked-in D1 fallbacks.

**Verse selection in the chapter reader:**
- Plain click — toggle a single verse (click again to deselect).
- Shift+click — extend the selection from the anchor (last single-clicked verse) to the clicked verse, contiguous range.
- Cmd/Ctrl+click — toggle this verse independently, supports non-contiguous selection (e.g. v.9 + v.11).
- Selection state lives on the chapter reader as a `ReadonlySet<number>`; the same model is used in the presenter dashboard so multi-window sync transports it via the `selection` BroadcastChannel message (`{ verses: number[] }`, replacing the older `range` message).

**Configurable verse copy:** when at least one verse is selected, a "Copy" button + gear-icon settings button appear in the action bar. Clicking Copy formats the selected verses with [`buildCopyText`](../apps/treasures/app/lib/copyVerses.ts) and writes to the clipboard. Settings live in `localStorage` under `bible_copy_options` and cover:
- Verse numbers on/off
- Reference line (book chapter:verse) on/off
- Translation name in parens on/off (only meaningful when the reference line is on)
- Link style: `none` / `short` (URL on its own line) / `full` (URL on a new line after blank)
- Verse separator: `newline` (each verse on its own line) / `space` (joined with spaces)

The reference line uses compact range notation: `John 3:16-18` for 16+17+18, `John 3:16,18` for non-contiguous, `John 3:16-17,19` for mixed.

**Action bar position:** the floating action bar uses `position: sticky` with `bottom: 1.5rem` inside `.bible-reader`, so it sticks to the viewport bottom while reading and lifts away with the chapter when the user scrolls into the footer — no overlap with footer content.

**Presenter / projector palette:** `.bible-presenter` and `.bible-projector` pin `--gold`, `--text`, `--text-strong`, `--muted`, `--border` to dark-theme values regardless of the site theme — same pattern as `.site-footer` (see `packages/ui/src/styles/tokens.css`). The presenter is always rendered on a near-black canvas, so legible cream text is required even when the rest of the site is in light theme.

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
