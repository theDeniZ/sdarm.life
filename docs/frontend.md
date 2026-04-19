# Frontend reference

## `apps/web` component map

| Component | Type | Notes |
|---|---|---|
| `layout.tsx` | Server | Root layout — imports CSS, renders `{children}` (no `<html>` — delegated to locale layout) |
| `[locale]/layout.tsx` | Server (async) | Locale layout — validates locale, wraps in `<NextIntlClientProvider>`, renders `<html lang={locale}><body>` |
| `[locale]/page.tsx` | Server (async) | Home page — fetches all data in parallel, maps to component types, passes as props |
| `[locale]/posts/[slug]/page.tsx` | Server (async) | Post detail page |
| `Navbar` | **Client** (`@sdarm/ui`) | Fixed nav; transparent → frosted glass on scroll. Mobile hamburger menu. Uses `useTranslations('common.nav')`. Includes language switcher (DE/EN) and secret 5-click logo theme toggle. |
| `HeroSection` | **Client** | Featured-posts strip carousel with per-slide color tints, fog animation, deco-circle, side label counter. Includes "Receive a gift" button that opens `BookRequestModal`. |
| `NewsSection` | **Client** | Static illustrated masonry grid — live news posts + static faith/event cards. Wired to API for news and latest video post. |
| `ProductsSection` | **Client** | 3-col editorial banner — category tabs, central image, text panel, counter/arrows |
| `ScriptureVerseSection` | **Client** | Daily rotating Scripture verse with `QuoteShareModal`. Verse rotated hourly from `lib/verses.ts` (DE + EN). |
| `GlaubensLongRead` | **Client** | 25 SDA Reform faith articles with accordion and hanging number layout. Detail content from sta-ref.de. |
| `GlaubensReader` | **Client** | EpubReader-style layout (toolbar + sidebar + content) for the GlaubensGrid — used on the About page. |
| `QuoteShareModal` | **Client** | Canvas-rendered verse share images. Themes: dark/light/paper. Formats: landscape (16:9), square (1:1), portrait (4:5). |
| `Footer` | **Client** (`@sdarm/ui`) | Dark theme — dot-grid, 3-column grid: contact+subscribe, nav links, location-aware sunset clock. Uses `useTranslations('common.footer')`. |

**Not rendered on home page** (files kept for future use): `VideoSection`, `SongbookSection`, `AboutSection`, `BgCanvas`.

`page.tsx` fetches in parallel: featured posts, news posts, latest video post, config — `cache: 'no-store'`. All return `null` on error → components fall back to static data silently.

Data mappers: `toHeroPost`, `toNewsPost`, `toFooterConfig`.

### Post detail page (`[locale]/posts/[slug]/page.tsx`)

Server component with edge runtime. Fetches single post + up to 5 other posts + config in parallel. Section labels are localized via `getTranslations('web.post')`.

**Layout:** `.post-hero` (cover image as full-bleed background + `.post-hero-overlay` gradient + back button) → `.post-section` with translated "Content" label (body text) → `.post-section` with "Video" (if `videoUrl` set, play button overlay) → `.post-section` with translated "More posts" (`.post-grid` of `.post-card` items, responsive grid).

CSS classes (in `globals.css`): `.post-hero`, `.post-hero-bg`, `.post-hero-overlay`, `.post-back`, `.post-meta`, `.post-section`, `.post-section-label`, `.post-body`, `.post-video`, `.post-video-card`, `.post-video-play`, `.post-more-title`, `.post-grid`, `.post-card`, `.post-card-img`, `.post-card-title`, `.post-card-meta`.

### HeroSection carousel

`'use client'` strip carousel. Receives only **featured** posts (`isFeatured = true`) via `posts?: HeroPost[]`. Falls back to a static placeholder if array is empty.

**`HeroPost` interface:**

| Field | Source | Used in |
|---|---|---|
| `title` | `posts.title` | Hero content h1 |
| `meta` | formatted date + author | Side label eyebrow |
| `body` | `posts.body` | Hero content paragraph |
| `excerpt` | `posts.excerpt` | Strip card preview text (falls back to `title`) |
| `imageUrl` | R2 cover key → URL | Kept in type but not rendered (no photo hero bg) |
| `thumbUrl` | R2 thumb key → URL | Strip card thumbnail via `<Image>` |
| `imageAlt` | `posts.cover_alt` | Alt text |
| `slug` | `posts.slug` | React key |

**Visual layers (bottom to top):** `.hero-base` (dark gradient) → `.hero-tint` (per-slide radial color tints, cross-fade on slide change) → `.fog` (animated pseudo-element blobs) → `.sculpture` (decorative radial glow) → `.deco-circle` (pulsing ring) → `.side-label` (eyebrow + counter) → `.hero-content` (title + subtitle) → `.strip-wrap` (card strip).

**Behaviour:** 5 s auto-cycle, progress bar restarted via React `key`, hero text cross-fade (420 ms), tints cross-fade (1.1 s). Strip cards use flex-grow animation with `.active` / `.leaving` classes. Card numbers use Bebas Neue font.

**Admin note:** `excerpt` is labelled **"Preview Text"** in PostForm — it drives the strip card text, not a traditional excerpt.

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
- On mount, fetches today + tomorrow sunrise/sunset from `https://api.sunrisesunset.io/json?lat=…&lng=…&timezone=…`
- Location resolved via Nominatim (`nominatim.openstreetmap.org`) from a user-entered postal code (worldwide, not DE-only). Last chosen location persisted to `localStorage`.
- Timezone determined dynamically via `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser timezone, not hardcoded `Europe/Berlin`).
- Parses `"HH:MM AM/PM"` strings → milliseconds since midnight
- Updates every 15 s via `setInterval`; SVG ring transition is `1s linear`
- SVG ring: `r=76`, `CIRC ≈ 477.52px`, `strokeDashoffset = CIRC * (1 - progress)`

**4 Sabbath-aware states** (determined by `new Date().getDay()` + time of day):

| Condition | `label` | `timeVal` |
|---|---|---|
| Friday (dow=5), daytime | `t('untilSabbath')` | today's sunset |
| Saturday (dow=6) | `t('sabbathEnds')` | today's sunset |
| Any other day, daytime | `t('untilSunset')` | today's sunset |
| Any day, nighttime | `t('untilSunrise')` | tomorrow's sunrise |

**Responsive:** tablet (≤900px) — clock spans `grid-column: 1 / 3`, row layout with clock left + text right; mobile (≤600px) — all columns stack, clock column-spans full width.

**Fallback:** API fetch failure is silently swallowed; clock stays at `'–:––'` / `'…'` placeholder.

### ThemeProvider

`ThemeProvider` (from `@sdarm/ui`) is a `'use client'` component that manages the light/dark theme toggle. Place it once in `[locale]/layout.tsx`, rendered before `{children}`.

- On mount: reads `localStorage` key `sdarm-theme` and applies `data-theme` attribute to `<html>`.
- Listens for custom event `sdarm:toggle-theme` (dispatched by Navbar's secret 5-click logo) and toggles between `dark` and `light`.
- Light theme overrides are defined in `packages/ui/src/styles/tokens.css` via `[data-theme="light"]` selector.

```tsx
// [locale]/layout.tsx
import { ThemeProvider } from '@sdarm/ui';
// ...
<body>
  <ThemeProvider />
  {children}
</body>
```

### SEO and structured data (`apps/web`)

- **`app/sitemap.ts`** — dynamic `sitemap.xml` generated at request time. Fetches all published post slugs from the API and produces `sitemap` entries for both `de` and `en` locales.
- **`app/robots.ts`** — `robots.txt` that allows all crawlers and points to the sitemap.
- **`[locale]/layout.tsx`** — injects `Organization` and `WebSite` JSON-LD structured data via `<script type="application/ld+json">`.
- **Page-level metadata** — home, about, and post pages export `generateMetadata()` with `openGraph` image/title/description and `alternates.canonical` + `alternates.languages` (hreflang).

### Layout notes

- Never add `export const runtime = 'edge'` to `layout.tsx` — set it only on individual page files.
- Root `layout.tsx` is minimal: imports CSS, returns `{children}`. No `<html>` or `<body>` tags — those are in the `[locale]/layout.tsx`.
- `[locale]/layout.tsx` validates the locale, calls `setRequestLocale()`, wraps children in `<NextIntlClientProvider messages={messages}>`, renders `<ThemeProvider />`, then `<html lang={locale}><body>`.
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

## `@sdarm/ui` shared components

All public-facing apps (`web`, `songbook`, `treasures`, `events`) import from `@sdarm/ui`. **Check here before building something from scratch** — the hero, footer, nav, and quote band are already done.

Import the design system once in the root layout:

```ts
import '@sdarm/ui/src/styles/index.css';
```

### Component reference

| Component | Import | Notes |
|---|---|---|
| `ThemeProvider` | `@sdarm/ui` | Client component. Place once in `[locale]/layout.tsx`. Reads/writes `localStorage` and sets `data-theme` on `<html>`. No visible output. |
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

**Mapper functions** (`toHeroPost`, `toNewsPost`, etc.) convert `PostDto` shapes into component-specific types. If used by one page only, they live in that page file. If used by two or more pages, move to `lib/api.ts`. Keep them pure.

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
| Hero cover / post detail cover | `w: 1200, q: 85` |
| News cards | `w: 600, h: 400` |
| Related post cards | `w: 400, h: 300` |
| Hero strip thumbnails | `w: 300, h: 200` |
| About page image | `w: 800` |
| Songbook sheet images | `w: 1200, q: 90` |
| Songbook sheet PDFs | no transform |

**Kill switch:** Set `R2_TRANSFORMS=false` env var to disable transforms and serve raw R2 URLs. Only needed if Image Transformations is disabled at the Cloudflare account level (which would cause `/cdn-cgi/image/` to return 403).

**Do not transform external URLs.** `FALLBACK_IMG` (Unsplash) and other external URLs are never passed through `r2url()` with transforms — they use their own query-string sizing.

After upload, use `URL.createObjectURL(file)` for preview. Do not switch to the R2 URL — wrangler local state is not served at `images.sdarm.life`. The R2 key is stored correctly regardless.

Direct R2 operations (wrangler, CF dashboard) bypass the `images` table. Any upload/delete outside the admin API requires a manual backfill (`POST /admin/images/backfill`).
