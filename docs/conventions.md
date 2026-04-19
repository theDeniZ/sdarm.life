# Conventions

## TypeScript

**Prefer narrowly typed interfaces over `any` / `Record<string, unknown>`.** API response types live in `@sdarm/types` (or `lib/api.ts` until migrated); component prop types live in the component file and are exported from there.

**Use `??` for nullish fallbacks, not `||`.** Empty strings are valid values in config fields.

**No `!` non-null assertions on API data.** Data from the network is always nullable — handle it explicitly.

**All API date fields are `string | null`.** Never type a date field as `number`. See [schema.md](schema.md) for the Drizzle timestamp note.

---

## Styling

No Tailwind, no CSS-in-JS. Pure class-based CSS in the app's `globals.css`.

**Design tokens (CSS custom properties):**

```css
/* apps/web — dark museum theme */
--gold: #c9a96e /* accent */ --dark: #0c0b09 /* body background */ --text: #d6d0c8 /* body text */ --muted: #7a7470
  /* secondary text */ --border: rgba(201, 169, 110, 0.12) /* strip carousel */
  --hc-ease: cubic-bezier(0.76, 0, 0.24, 1) --hc-dur: 0.7s --hc-h: 134px --hc-grow: 34px /* admin only: */
  --sidebar-w: 220px --admin-bg: #f4f2ef;
```

**Typography stack (web):** Cormorant Garamond (body), DM Serif Display (headings, italic), Playfair Display (logo, footer heading), Bebas Neue (card numbers), Oswald (counters, buttons). Loaded via `@import` in `globals.css`.

**Full-width layout.** All sections are full-width (no `.page` wrapper, no grid margins). Section backgrounds span the viewport.

---

## Code formatting

**Prettier** (print width 120, single quotes, 2 spaces) and **ESLint** run automatically on file save (via VS Code). Both are configured in `.prettierrc.json` and `eslint.config.mjs` files.

**Format all files at once:** `pnpm -r lint --fix`

**Do not commit code with formatting errors.** ESLint will fail CI if formatting rules are violated.

---

## Environment variables

### `apps/web`

| Variable        | Dev (`.env.local`)                    | Production fallback              |
| --------------- | ------------------------------------- | -------------------------------- |
| `API_URL`       | `http://localhost:8787/api/v1`        | `https://api.sdarm.life/api/v1`  |
| `R2_URL`        | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life`      |
| `WEB_URL`       | `http://localhost:3000`               | `https://sdarm.life`             |
| `TREASURES_URL` | `http://localhost:3002`               | `https://treasures.sdarm.life`   |
| `R2_TRANSFORMS` | _(not set)_                           | _(not set — enabled by default)_ |

Server-only (no `NEXT_PUBLIC_` prefix). Client components cannot read these — pass as props from the server component.

`WEB_URL` and `TREASURES_URL` are used to build cross-app links (e.g. book request links back to the web app). Never hardcode these URLs — always read from `lib/api.ts`.

`R2_TRANSFORMS` is an emergency kill switch. Set to `false` to disable Cloudflare Image Transformations and serve raw R2 URLs. Leave unset for normal operation.

### `apps/admin`

| Variable              | Dev (`.env.local`)                    | Production                  |
| --------------------- | ------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787`               | `https://api.sdarm.life`    |
| `NEXT_PUBLIC_R2_URL`  | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life` |
| `NEXT_PUBLIC_API_KEY` | `dev`                                 | managed API key             |

`NEXT_PUBLIC_API_URL` has **no `/api/v1` suffix** — components append the full path themselves.

### `apps/songbook`

| Variable        | Dev (`.env.local`)      | Production fallback              |
| --------------- | ----------------------- | -------------------------------- |
| `WEB_URL`       | `http://localhost:3000` | `https://sdarm.life`             |
| `R2_TRANSFORMS` | _(not set)_             | _(not set — enabled by default)_ |

Server-only (no `NEXT_PUBLIC_` prefix). `R2_TRANSFORMS` — same kill switch as `apps/web`.

### `apps/api` (local dev only)

`apps/api/.dev.vars` (gitignored, auto-loaded by `wrangler dev`):

```
API_KEY=dev
```

Never put secrets in `wrangler.jsonc`.

---

## Internationalization (i18n)

All public-facing apps (`web`, `songbook`, `events`, `treasures`) use `next-intl` for localization. The admin app is not localized.

**Supported locales:** `de` (default), `en`. Configured in `packages/i18n/src/config.ts`.

**URL structure:** `/{locale}/path` — e.g. `/de/about`, `/en/about`. The middleware auto-redirects `/` to `/{browserLocale}/` with German as fallback.

**Message files:** `packages/i18n/src/messages/de.json` and `en.json`. All UI strings live here — namespaced by app (`web.*`, `songbook.*`, `events.*`, `treasures.*`) with shared keys under `common.*`.

**How to add a new string:**

1. Add the key to both `de.json` and `en.json`
2. Use `getTranslations('namespace')` in server components or `useTranslations('namespace')` in client components
3. Use ICU message format for interpolation: `t('key', { count: 5 })` with `"{count} items"` in the JSON

**`ConnectedNavbar` and `ConnectedFooter`** receive `locale` as a prop from the page/layout server component. They pass it to the underlying `Navbar`/`Footer` client components which use `useTranslations()`.

**Each app has three i18n files:**

- `i18n/routing.ts` — `defineRouting()` with locales from `@sdarm/i18n`
- `i18n/request.ts` — `getRequestConfig()` that imports message JSON and resolves locale
- `middleware.ts` — `createMiddleware(routing)` with matcher `['/', '/(de|en)/:path*']`

**Do not use dynamic `import()` with template literals** for message files — webpack cannot resolve them against the package exports map. Use static imports instead (see `i18n/request.ts`).

---

## Documentation

**Documentation is a living artifact — always update it as part of any task.** This applies to every type of work: bug fixes, new features, new apps, refactors, schema changes, API changes, convention changes. No task is complete until the relevant doc files reflect the current state.

- Update `docs/api.md` whenever a route is added, changed, or removed.
- Update `docs/schema.md` whenever the DB schema or config keys change.
- Update `docs/frontend.md` whenever a component is added, changed, or removed from any app.
- Update `docs/architecture.md` whenever package boundaries, folder structure, or patterns change.
- Update `docs/conventions.md` for any new project-wide rule.
- Update `docs/gotchas.md` whenever a non-obvious failure mode is discovered.

When in doubt about which file to update, update the one closest to what changed. If the change touches multiple docs, update all of them in the same commit.

---

## Git strategy

**`main` is never touched directly.** No direct commits, no pushes. `main` is the production branch — it only receives changes via merged PRs.

### Preferred workflow: feature branch + PR

1. Cut a branch from `develop`: `git checkout -b feat/my-feature develop`
2. Commit work on the feature branch.
3. Open a PR from the feature branch into `develop`.
4. Walk through the PR review before merging.

When completing a task that warrants a PR, always suggest opening one and walk through the process.

### Fallback: commit directly on `develop`

Acceptable for small fixes when a full PR is overkill. Never commit directly to `main`.

### Commit discipline

**Keep commits lean and scoped.** The goal is a clean, readable history — not one commit per file change and not one giant commit per session.

**Amend vs. new commit:**

- Compare the files about to be staged against the most recent commit message on the branch.
- If the scope is the same or a subset (e.g., fixing a detail of what was just built), **amend the previous commit** rather than adding a new one.
- If the scope is clearly new (a second distinct feature after the first is already committed), **create a new commit**.
- **Never amend a commit that has already been pushed to remote.** Check with `git status` / `git log --oneline origin/develop..HEAD` first. If the commit is on remote, create a new commit instead.

**No force-pushes.** Ever. Not to `develop`, not to feature branches, not to `main`.

**No `--no-verify`.** Fix the underlying hook failure — do not skip it.

---

## General code quality

- Do not add abstractions for single-use operations.
- Do not add error handling for impossible states inside trusted internal code. Validate only at system boundaries (user input, external APIs).
- Do not add comments to code that reads plainly on its own.
- Do not create new files when editing an existing one solves the problem.
- Do not push config keys that are not in `KNOWN_CONFIG_KEYS`.
- Do not over-engineer: three similar lines of code is better than a premature abstraction.
