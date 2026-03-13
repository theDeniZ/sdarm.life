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
--gold:    #c9a96e      /* accent */
--dark:    #0c0b09      /* body background */
--text:    #d6d0c8      /* body text */
--muted:   #7a7470      /* secondary text */
--border:  rgba(201,169,110,0.12)

/* strip carousel */
--hc-ease: cubic-bezier(0.76, 0, 0.24, 1)
--hc-dur:  0.7s
--hc-h:    134px
--hc-grow: 34px

/* admin only: */
--sidebar-w: 220px
--admin-bg: #f4f2ef
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

| Variable  | Dev (`.env.local`)                    | Production fallback             |
| --------- | ------------------------------------- | ------------------------------- |
| `API_URL` | `http://localhost:8787/api/v1`        | `https://api.sdarm.life/api/v1` |
| `R2_URL`  | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life`     |

Server-only (no `NEXT_PUBLIC_` prefix). Client components cannot read these — pass as props from the server component.

### `apps/admin`

| Variable                       | Dev (`.env.local`)                    | Production                  |
| ------------------------------ | ------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`          | `http://localhost:8787`               | `https://api.sdarm.life`    |
| `NEXT_PUBLIC_R2_URL`           | `http://localhost:8787/api/v1/images` | `https://images.sdarm.life` |
| `NEXT_PUBLIC_CF_CLIENT_ID`     | `dev`                                 | random hex                  |
| `NEXT_PUBLIC_CF_CLIENT_SECRET` | `dev`                                 | random hex                  |

`NEXT_PUBLIC_API_URL` has **no `/api/v1` suffix** — components append the full path themselves.

### `apps/api` (local dev only)

`apps/api/.dev.vars` (gitignored, auto-loaded by `wrangler dev`):

```
CF_CLIENT_ID=dev
CF_CLIENT_SECRET=dev
```

Never put secrets in `wrangler.jsonc`.

---

## General code quality

- Do not add abstractions for single-use operations.
- Do not add error handling for impossible states inside trusted internal code. Validate only at system boundaries (user input, external APIs).
- Do not add comments to code that reads plainly on its own.
- Do not create new files when editing an existing one solves the problem.
- Do not push config keys that are not in `KNOWN_CONFIG_KEYS`.
- Do not over-engineer: three similar lines of code is better than a premature abstraction.
