# Architecture

## Principles

**Monorepo boundaries are strict.** Each app (`web`, `admin`, `api`) owns its own logic. Shared code lives only in `packages/`. Do not import from one app into another.

**`@sdarm/db` is the single source of truth for schema and config keys.** Both `api` and `admin` import `KNOWN_CONFIG_KEYS` from there — never hardcode config keys elsewhere.

**D1 is canonical; R2 is a blob store.** All image existence/metadata queries hit D1. R2 is write-only from the API perspective. Never query R2 to enumerate images.

**Site config lives in Workers KV.** All config key-value pairs are stored as a single JSON object under the KV key `config`. The D1 `site_config` table is dormant (kept as backup, not read or written).

---

## Target structure (migration goal)

New code must follow this structure. Existing code should be migrated incrementally.

### Shared types: `packages/types`

API response shapes (`PostDto`, `ImageDto`, etc.) are currently redefined in both `apps/web` and `apps/admin`. They belong in a new shared package `packages/types` (`@sdarm/types`).

**Separation of concerns:**
- `@sdarm/db` — Drizzle schema definitions (DB layer). Types have `Date` objects and internal fields.
- `@sdarm/types` — HTTP response types (API contract layer). Types have ISO strings and only publicly surfaced fields.
- `@sdarm/ui` — Shared React components and the dark museum CSS design system used by all public-facing apps.
- `@sdarm/i18n` — Shared i18n config (`locales`, `defaultLocale`) and message JSON files (`de.json`, `en.json`).

```
packages/
  db/      — @sdarm/db   : Drizzle schema, migrations, KNOWN_CONFIG_KEYS
  types/   — @sdarm/types: Shared DTO interfaces for API responses
  ui/      — @sdarm/ui   : Navbar, Footer, Pagination + CSS design system
  i18n/    — @sdarm/i18n : Locale config, de/en message files
```

```ts
// packages/types/src/index.ts

export interface PostDto {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  thumbKey: string | null;
  isFeatured: boolean;
  publishedAt: string | null;  // ISO string — never number
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ImageDto {
  key: string;
  size: number;
  uploaded: string;
  usedIn: { type: string; label: string }[];
}

export interface SubscriberDto {
  id: number;
  email: string;
  createdAt: string;
}

export type ConfigDto = Record<string, string | null>;

export interface ListResponse<T> { items: T[]; total: number; }

export interface SongbookDto {
  id: number;
  title: string;
  slug: string;
  language: string;
  description: string | null;
  coverKey: string | null;
  sortOrder: number;
  songCount: number;  // computed, not stored
}

export interface SongListItemDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
}

export type SongPartType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'coda';
export type SongSheetType = 'pdf' | 'image';

export interface SongPartDto {
  id: number;
  type: SongPartType;
  label: string;
  sortOrder: number;
  lyrics: string;  // plain text; chords embedded inline as [G], [C], etc.
}

export interface SongSheetDto {
  id: number;
  key: string;  // R2 key, serve via images.sdarm.life/{key}
  type: SongSheetType;
  sortOrder: number;
}

export interface SongDto {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
  songbook: { id: number; title: string; slug: string };
  parts: SongPartDto[];
  sheets: SongSheetDto[];
  createdAt: string;
  updatedAt: string;
}
```

`apps/web` and `apps/admin` import from `@sdarm/types`. `apps/api` uses the same interfaces to type `c.json()` responses — enforcing the contract at the source.

**Current state:** `apps/api/src/schemas.ts` holds Zod schemas (`PostSchema`, `ImageSchema`, `SubscriberSchema`, etc.) used by `@hono/zod-openapi` to generate the OpenAPI spec and validate requests at runtime. These schemas are the single source of truth for the API contract. When `packages/types` is created, its interfaces should be derived from these schemas via `z.infer<>` rather than written separately.

---

### Shared UI: `packages/ui`

React components and the dark museum CSS design system used by all public-facing apps (`web`, `songbook`, and any future apps).

```
packages/ui/src/
  components/
    Navbar.tsx       — fixed nav; transparent → frosted glass on scroll
    Footer.tsx       — 3-col: contact+subscribe, nav links, sunset clock
    Pagination.tsx   — generic offset pagination (styling left to consumer)
  styles/
    tokens.css       — Google Fonts import, CSS custom properties, base reset
    navbar.css       — nav component styles + responsive breakpoints
    footer.css       — footer + sunset clock styles + responsive breakpoints
    index.css        — @imports all three (single entry point)
  index.ts           — re-exports all components + FooterConfig type
```

**How to use in a new app:**

```ts
// layout.tsx
import '@sdarm/ui/src/styles/index.css'; // dark museum theme
```

```ts
// any component
import { Navbar, Footer } from '@sdarm/ui';
import type { FooterConfig } from '@sdarm/ui';
```

**CSS design tokens** (set in `tokens.css`, available via `var()` everywhere after the import):

| Token | Value | Use |
|---|---|---|
| `--gold` | `#c9a96e` | Accent colour |
| `--dark` | `#0c0b09` | Body background |
| `--text` | `#d6d0c8` | Body text |
| `--muted` | `#7a7470` | Secondary text |
| `--border` | `rgba(201,169,110,0.12)` | Subtle separator |
| `--hc-ease` | `cubic-bezier(0.76,0,0.24,1)` | Strip carousel easing |

**Pagination CSS is not included** — it uses admin-specific variables (`--red`, `--border` from admin theme). The `Pagination` component is shared but consumers style it via their own globals.

**Peer dependencies:** `next >=15`, `react >=19` — all current apps already satisfy these.

---

### API: domain-based routes + repositories

`apps/api/src/index.ts` currently contains all routes, DB queries, and middleware in one file. `index.ts` must become assembly-only.

**Target structure:**

```
apps/api/src/
  routes/
    posts.ts           — GET /posts, GET /posts/:slug
    config.ts          — GET /config
    images.ts          — GET /images/* (local dev proxy)
    subscribers.ts     — POST /subscribe, GET /unsubscribe
    admin/
      posts.ts         — CRUD /admin/posts
      config.ts        — PUT /admin/config/:key
      images.ts        — GET|DELETE|POST /admin/images
      subscribers.ts   — GET|DELETE /admin/subscribers
  repositories/
    posts.ts           — all DB queries for the posts table
    config.ts          — all DB queries for site_config
    images.ts          — all DB queries for the images table
    subscribers.ts     — all DB queries for the subscribers table
  middleware/
    auth.ts            — CF Access header verification middleware
  schemas.ts           — shared Zod schemas (PostSchema, ImageSchema, etc.) — source of truth for OpenAPI spec
  types.ts             — Bindings type, shared request body shapes
  index.ts             — CORS, route mounting, OpenAPI spec + Swagger UI, export default app
```

**Repository pattern for Workers.** Repositories are plain modules exporting functions that take a `db` (Drizzle instance) as their first argument. No classes, no constructors — Workers have no persistent state between requests.

```ts
// repositories/posts.ts
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function listPosts(db: DrizzleD1Database, opts: {
  featured?: boolean;
  video?: boolean;
  limit?: number;
  offset?: number;
}) { ... }

export async function getPostBySlug(db: DrizzleD1Database, slug: string) { ... }
export async function getPostById(db: DrizzleD1Database, id: number) { ... }
export async function createPost(db: DrizzleD1Database, data: CreatePostInput) { ... }
export async function updatePost(db: DrizzleD1Database, id: number, data: UpdatePostInput) { ... }
export async function softDeletePost(db: DrizzleD1Database, id: number) { ... }
```

Route handlers instantiate `db` from `c.env.DB` and call repository functions. They contain no raw Drizzle queries.

---

### Admin app: domain-based layout

`apps/admin` is already domain-shaped. The generic `components/` folder should flatten into per-domain subfolders. Truly shared UI components stay in `components/`.

**Target structure:**

```
apps/admin/app/
  lib/
    api.ts             — API + R2 URL constants, adminHeaders(), r2url()
    format.ts          — fmtDate(), fmtSize(), toLocalDatetime()
    hooks.ts           — usePaginatedList()
  domains/
    posts/
      PostList.tsx
      PostForm.tsx
      types.ts         — PostFormData, PostListItem (view-model types)
      repository.ts    — fetch wrappers for /admin/posts endpoints
    images/
      ImageLibrary.tsx
      ImagePicker.tsx
      ImageUpload.tsx
      types.ts
      repository.ts    — fetch wrappers for /admin/images endpoints
    config/
      ConfigEditor.tsx
      types.ts
      repository.ts    — fetch wrappers for /admin/config endpoints
    subscribers/
      SubscriberList.tsx
      types.ts
      repository.ts    — fetch wrappers for /admin/subscribers endpoints
  components/          — shared UI only: AdminShell, Sidebar, Pagination
  posts/               — Next.js route files (import from domains/posts/)
    page.tsx
    new/page.tsx
    [id]/page.tsx
  images/page.tsx
  config/page.tsx
  subscribers/page.tsx
  layout.tsx
```

**Domain `repository.ts`** contains all fetch calls for that domain. Components never call `fetch` directly — they call repository functions.

```ts
// domains/posts/repository.ts
import { API, adminHeaders } from '@/lib/api';
import type { PostDto, ListResponse } from '@sdarm/types';

export async function fetchPosts(page: number, limit: number): Promise<ListResponse<PostDto>> { ... }
export async function deletePost(id: number): Promise<void> { ... }
export async function toggleFeatured(id: number, value: boolean): Promise<void> { ... }
```

**`types.ts` per domain** holds component-layer types (view models, form data) specific to the admin UI — not in `@sdarm/types`.

```ts
// domains/posts/types.ts
import type { PostDto } from '@sdarm/types';

export type PostListItem = Pick<PostDto, 'id' | 'title' | 'slug' | 'isFeatured' | 'publishedAt'>;

export interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  videoUrl: string;
  coverKey: string | null;
  coverAlt: string;
  thumbKey: string | null;
  isFeatured: boolean;
  publishedAt: string;
}
```

---

### Admin app: state management

All list components duplicate the same loading/pagination pattern. Extract to a shared hook.

**`usePaginatedList`** (`app/lib/hooks.ts`):

```ts
export function usePaginatedList<T>(
  fetcher: (page: number) => Promise<ListResponse<T>>,
  deps: unknown[] = [],
) {
  const [page, setPage]   = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetcher(page)
      .then(({ items, total }) => { setItems(items); setTotal(total); })
      .finally(() => setLoading(false));
  }, [page, ...deps]);

  return { items, total, page, loading, setPage, reload: () => setPage((p) => p) };
}
```

Components pass a repository function as `fetcher`. Mutations call the repository then `reload()`.

**Mutation conventions:**
- Each action is a local `async function handle<Action>()` in the component
- Disable the triggering control while in-flight
- On success, call `reload()` — do not manually splice arrays
- Errors surface as local state; never throw to an error boundary for expected API errors

**`apps/web`** is primarily server-rendered. `HeroSection`, `Footer`, and `BgCanvas` are self-contained. Apply `usePaginatedList` only if a client-fetched list is added.

---

## Shared code within an app

Cross-cutting concerns (env constants, auth headers, formatters, API types) must not be copy-pasted per file. **Define once, import everywhere.**

### `lib/` folder per app

```
apps/web/app/lib/
  api.ts       — API + R2 URL constants, r2url(), fetchPosts(), fetchConfig(), FALLBACK_IMG
  format.ts    — formatDate()

apps/admin/app/lib/
  api.ts       — API + R2 URL constants, adminHeaders(), r2url(), FALLBACK_IMG
  format.ts    — fmtDate(), fmtSize(), toLocalDatetime()
  hooks.ts     — usePaginatedList()
```

Do not create `utils/` at the monorepo root for app-specific code — it breaks isolation. Only framework-free, truly cross-app logic belongs in a shared package.

### Constants

```ts
// apps/web/app/lib/api.ts
export const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
export const R2  = process.env.R2_URL  ?? 'https://images.sdarm.life';
export const FALLBACK_IMG = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop';

export interface ImageTransform {
  w?: number;
  h?: number;
  q?: number;
}

export function r2url(key: string | null, opts?: ImageTransform): string | null {
  if (!key) return null;
  const base = `${R2}/${key}`;
  // Transforms only work on the production CDN, not localhost
  // Set R2_TRANSFORMS=false to disable as emergency kill switch
  if (!opts || !TRANSFORMS_ENABLED || R2.includes('localhost')) return base;
  const params = [opts.w && `w=${opts.w}`, opts.h && `h=${opts.h}`, `f=auto`, `q=${opts.q ?? 80}`]
    .filter(Boolean)
    .join(',');
  return `${R2}/cdn-cgi/image/${params}/${key}`;
}
```

```ts
// apps/admin/app/lib/api.ts
export const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
export const R2  = process.env.NEXT_PUBLIC_R2_URL  ?? 'https://images.sdarm.life';
```

### Auth headers

```ts
// apps/admin/app/lib/api.ts
export function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id':     process.env.NEXT_PUBLIC_CF_CLIENT_ID     ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}
```

Every admin component imports `adminHeaders()` — no component defines its own.

### Types

- API response types (`PostDto`, `ApiConfig`) → `@sdarm/types` (target) or `lib/api.ts` (interim)
- Component prop types (`HeroPost`, `NewsPost`, `FooterConfig`) → the component file that defines the component, exported from there
- Domain view-model and form types → `domains/<name>/types.ts`

### Date formatters

```ts
// apps/web/app/lib/format.ts
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
```

```ts
// apps/admin/app/lib/format.ts
export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### The two-instance rule

If the same constant, function, or type appears in **two or more files within the same app**, extract it to `lib/`. One occurrence inline is fine. Two is the threshold.
