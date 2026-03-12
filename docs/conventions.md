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
--red: #c0392b          /* accent */
--dark: #1a1a1a
--gray: #999
--mid: #555
--text: #2c2c2c
--light: #f7f5f2
--border: #e4dfd8
--warm-bg: #d8d2c8
--foot-bg: #ece8e2
--gl: 188px             /* left grid margin */
--gr: 144px             /* right grid margin */
--pw: 1152px            /* page width */
--r: 5px                /* border radius */
/* admin only: */
--sidebar-w: 220px
--admin-bg: #f4f2ef
```

**`.page { background: #fff }` is required** on every page wrapper — without it, `BgCanvas` bleeds through transparent sections.

**Layout bleeding** (full-width sections) uses `margin-left: calc(-1 * var(--gl))` / `margin-right: calc(-1 * var(--gr))`. Do not use ad hoc negative margins outside this pattern.

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
