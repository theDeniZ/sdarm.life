# Frontend reference

## `apps/web` component map

| Component | Type | Notes |
|---|---|---|
| `layout.tsx` | Server | Root layout — imports `globals.css`, renders `<html>` + `<body>` shell |
| `page.tsx` | Server (async) | Home page — fetches all data in parallel, maps to component types, passes as props |
| `posts/[slug]/page.tsx` | Server (async) | Post detail page |
| `Navbar` | **Client** | Fixed nav; transparent → frosted glass on scroll. Gold underline hovers, sunset widget stub, hamburger icon |
| `HeroSection` | **Client** | Featured-posts strip carousel with per-slide color tints, fog animation, deco-circle, side label counter |
| `NewsSection` | **Client** | Editorial carousel — stacked images, side preview cards, prev/next arrows |
| `ProductsSection` | **Client** | 3-col editorial banner — category tabs, central image, text panel, counter/arrows |
| `Footer` | **Client** | Dark theme — dot-grid, contact+subscribe column, nav links column. Accepts `apiUrl` prop (passed from server via `process.env.API_URL`). |

**Not rendered on home page** (files kept for future use): `VideoSection`, `SongbookSection`, `AboutSection`, `BgCanvas`.

`page.tsx` fetches in parallel: featured posts, 4 news posts, config — `cache: 'no-store'`. All return `null` on error → components fall back to static data silently.

Data mappers: `toHeroPost`, `toNewsPost`, `toFooterConfig`.

### Post detail page (`posts/[slug]/page.tsx`)

Server component with edge runtime. Fetches single post + up to 5 other posts + config in parallel.

**Layout:** `.post-hero` (cover image as full-bleed background + `.post-hero-overlay` gradient + back button) → `.post-section` with "Inhalt" label (body text) → `.post-section` with "Video" (if `videoUrl` set, play button overlay) → `.post-section` with "Weitere Beiträge" (`.post-grid` of `.post-card` items, responsive grid).

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

### NewsSection editorial carousel

`'use client'` carousel. Receives news posts via `posts?: NewsPost[]`. Falls back to static data.

**`NewsPost` interface:** `id`, `title`, `date`, `author`, `body`, `imageUrl`, `imageAlt`, `href`.

**Layout:** `.events-section` (dark `#141310` bg) → `.ev-viewport` containing: prev/next circle arrows, left/right `.ev-side` preview cards (clickable), `.ev-main` with stacked images (`.ev-img-top` + `.ev-img-bot`) and text panel (`.ev-text` with gold accent line, title, meta, description, "Mehr erfahren" button).

Side previews hidden on mobile; images switch to side-by-side row layout.

### ProductsSection editorial banner

`'use client'` banner. Uses static `STATIC_PRODUCTS` data with `Product` interface: `id`, `imageUrl`, `imageAlt`, `category`, `tag`, `title`, `description`, `meta`, `href?`.

**Layout:** `.prod-banner-stage` is a CSS grid with 3 columns: vertical category tabs (`.prod-cats`) | central image (`.prod-img-wrap`) | text panel (`.prod-text-panel`) + counter/arrows (`.prod-nav`). Clicking a category tab jumps to the first product in that category.

### Layout notes

- Never add `export const runtime = 'edge'` to `layout.tsx` — set it only on individual page files.
- `layout.tsx` is minimal: imports `globals.css`, sets metadata, renders `<html><body>{children}</body></html>`. No data fetching.

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

After upload, use `URL.createObjectURL(file)` for preview. Do not switch to the R2 URL — wrangler local state is not served at `images.sdarm.life`. The R2 key is stored correctly regardless.

Direct R2 operations (wrangler, CF dashboard) bypass the `images` table. Any upload/delete outside the admin API requires a manual backfill (`POST /admin/images/backfill`).
