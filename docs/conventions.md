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
| `SONGBOOK_URL`  | `http://localhost:3003`               | `https://songs.sdarm.life`       |
| `EVENTS_URL`    | `http://localhost:3004`               | `https://events.sdarm.life`      |
| `R2_TRANSFORMS` | _(not set)_                           | _(not set — enabled by default)_ |

Server-only (no `NEXT_PUBLIC_` prefix). Client components cannot read these — pass as props from the server component.

`WEB_URL`, `TREASURES_URL`, `SONGBOOK_URL`, and `EVENTS_URL` are used to build cross-app links (e.g. NewsSection cards linking to other apps). Never hardcode these URLs — always read from `lib/api.ts`.

`R2_TRANSFORMS` is an emergency kill switch. Set to `false` to disable Cloudflare Image Transformations and serve raw R2 URLs. Leave unset for normal operation.

### `apps/admin`

| Variable              | Dev (`.env.local`)                    | Production                  | Scope       |
| --------------------- | ------------------------------------- | --------------------------- | ----------- |
| `API_URL`             | `http://localhost:8787`               | `https://api.sdarm.life`    | server-only |
| `API_KEY`             | `dev`                                 | managed API key             | **server-only** |
| `NEXT_PUBLIC_R2_URL`  | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life` | browser OK  |

**Never prefix `API_KEY` with `NEXT_PUBLIC_`** — it would embed the bearer token in the JS bundle. Admin API calls go same-origin (`/api/v1/*`) and are proxied server-side by `apps/admin/app/api/v1/[...path]/route.ts`, which injects the bearer from the server-only `API_KEY` env var.

`API_URL` has **no `/api/v1` suffix** — the proxy appends the path itself.

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

⚠️ **See [gitflow.md](gitflow.md) for the complete and binding rules.** This is not optional.

**TL;DR:**
- **NEVER commit to `main` or `develop` directly.** Always use feature branches (`feat/*`).
- **ONE commit per PR, always.** Rebase interactively if needed: `git rebase -i develop`.
- **Rebase before opening PR.** Ensure linear history: `git rebase develop`.
- **Fast-forward merge only.** Use "Rebase and merge" on GitHub, never "Create a merge commit."
- **No force-pushes after PR is open.** Use `--force-with-lease` only on your own branch before PR.
- **No `--no-verify`.** Fix the hook failure, do not skip it.

**Workflow:**

1. Create feature branch from `develop`: `git checkout -b feat/my-feature develop`
2. Commit as needed locally.
3. Before opening PR: `git rebase -i develop` to squash into one commit.
4. Push: `git push origin feat/my-feature`
5. Open PR from feature branch → `develop`.
6. Review & approve.
7. Merge via GitHub UI (Rebase and merge).
8. Delete branch: `git branch -d feat/my-feature && git push origin --delete feat/my-feature`

**Read [gitflow.md](gitflow.md) for full details, common scenarios, and troubleshooting.**

---

## General code quality

- Do not add abstractions for single-use operations.
- Do not add error handling for impossible states inside trusted internal code. Validate only at system boundaries (user input, external APIs).
- Do not add comments to code that reads plainly on its own.
- Do not create new files when editing an existing one solves the problem.
- Do not push config keys that are not in `KNOWN_CONFIG_KEYS`.
- Do not over-engineer: three similar lines of code is better than a premature abstraction.

---

## Responsive — check every frontend change

Every UI change must be verified on multiple viewport widths before being marked done. Layout breaks at unexpected sizes are a recurring source of bugs in this project.

**Minimum sizes to verify:**

| Width | Device class | What to check |
|---|---|---|
| **≥1280px** | Desktop | Default layout — nothing crowded, gaps respected |
| **1024px** | Small desktop / tablet landscape | Nav links don't touch the logo or right-side utilities |
| **768px** | Tablet portrait | Last viable point for inline nav — usually the breakpoint to a burger menu |
| **375px** | Mobile (iPhone) | Burger visible, touch targets ≥44×44, no horizontal scroll, safe-area for notch |

- Use Chrome DevTools device toolbar (`Cmd+Shift+M`) — switch through the standard presets after editing any layout-affecting CSS or component.
- Check **both** `data-theme="light"` (default) and `data-theme="dark"` (5 clicks on the logo toggles).
- Watch for: text touching, content bleeding under fixed headers, horizontal scrollbars, touch targets smaller than 44×44, fixed elements ignoring iPhone notch (`env(safe-area-inset-*)`).
- Type-check passing ≠ layout works. Do not say "responsive done" until breakpoints have been clicked through visually.
