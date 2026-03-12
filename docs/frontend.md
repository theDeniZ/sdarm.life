# Frontend reference

## `apps/web` component map

| Component | Type | Notes |
|---|---|---|
| `layout.tsx` | Server (async) | Root layout — fetches config, renders `BgCanvas` once for all pages |
| `page.tsx` | Server (async) | Home page — fetches all data in parallel, maps to component types, passes as props |
| `posts/[slug]/page.tsx` | Server (async) | Post detail page |
| `BgCanvas` | **Client** | Canvas grayscale background — lives in `layout.tsx`, persists across navigations |
| `Navbar` | **Client** | Sticky nav; all links use `/#section` hrefs for always-home anchors |
| `HeroSection` | **Client** | Featured-posts strip carousel + static fallback |
| `NewsSection` | Server | 2-col news grid; cards link to `/posts/[slug]` via `<Link>` |
| `VideoSection` | Server | 2-col video grid |
| `SongbookSection` | Server | Static search + song cards |
| `AboutSection` | Server | 2-col about layout |
| `ProductsSection` | **Client** | Book/product cards |
| `Footer` | **Client** | Subscribe, donate, socials. Accepts `apiUrl` prop (passed from server via `process.env.API_URL`). |

`page.tsx` fetches in parallel: all featured posts, 4 news posts, 4 video posts, config — `cache: 'no-store'`. All return `null` on error → components fall back to static data silently.

Data mappers: `toHeroPost`, `toNewsPost`, `toVideoPost`, `toAboutConfig`, `toFooterConfig`.

### Post detail page (`posts/[slug]/page.tsx`)

Server component with edge runtime. Fetches single post + up to 5 other posts in parallel.

**Layout:** hero (cover image as full-bleed background + overlay + back button) → Inhalt section (body text) → Video section (if `videoUrl` set) → Weitere Beiträge grid (up to 4 other posts).

CSS classes (in `globals.css`): `.post-hero`, `.post-back`, `.post-meta`, `.post-body`, `.post-more-title`. Reuses `.hero*`, `.section-block`, `.section-label`, `.video-card`, `.news-card`.

### HeroSection carousel

`'use client'` strip carousel. Receives only **featured** posts (`isFeatured = true`) via `posts?: HeroPost[]`. Falls back to a static placeholder if array is empty.

**`HeroPost` interface:**

| Field | Source | Used in |
|---|---|---|
| `title` | `posts.title` | Detail area (h1) |
| `meta` | formatted date + author | Detail area |
| `body` | `posts.body` | Detail area paragraph |
| `excerpt` | `posts.excerpt` | Strip card preview text (falls back to `title`) |
| `imageUrl` | R2 cover key → URL | Hero background + card thumbnail |
| `imageAlt` | `posts.cover_alt` | Alt text |
| `slug` | `posts.slug` | React key + link href |

**Layout:** `.hero` (full-bleed, dark background + overlay, text bottom-aligned) sits above `.hero-strip-wrap` (full-bleed dark strip). Both bleed via `margin-left: calc(-1 * var(--gl))` / `margin-right: calc(-1 * var(--gr))`.

**Behaviour:** 5 s auto-cycle, progress bar restarted via React `key`, hero text + background cross-fade (420 ms), strip scrolls horizontally on overflow. Card text slides in from right, exits left on `.leaving`.

**Admin note:** `excerpt` is labelled **"Preview Text"** in PostForm — it drives the strip card text, not a traditional excerpt.

### `BgCanvas` placement

`layout.tsx` fetches `hero_bg_key` from config and passes it to `BgCanvas`. Falls back to a static Unsplash URL. `BgCanvas` is **not** in individual pages — it lives in the layout so it persists across client-side navigations without redraw flicker.

- `BgCanvas` z-index must be `-1`. At `0` it covers page text.
- Every page wrapper needs `.page { background: #fff }` to prevent canvas bleed through transparent sections.
- Never add `export const runtime = 'edge'` to `layout.tsx` — set it only on individual page files.

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

**Internal links always use `<Link>`.** Plain `<a href>` triggers a full reload, remounts `BgCanvas`, causes background flicker.

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
