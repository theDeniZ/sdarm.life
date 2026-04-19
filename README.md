# sdarm.life

Content-driven website for the SDARM community. Public site, admin panel, and REST API — all hosted on the Cloudflare stack.

## Architecture

```
apps/
├── web/     → Next.js 15 public site          → sdarm.life          (Cloudflare Pages)
├── admin/   → Next.js 15 admin UI             → admin.sdarm.life    (Cloudflare Pages + Access)
└── api/     → Hono Cloudflare Worker          → api.sdarm.life      (Cloudflare Worker)
packages/
└── db/      → Drizzle schema + migrations     (shared across all apps)
```

Managed with **pnpm workspaces** + **Turborepo**. Schema and migrations live in `packages/db` and are shared across the Worker and admin app.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Wrangler CLI (`pnpm i -g wrangler`)
- Cloudflare account with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

## Getting started

```bash
pnpm install
pnpm turbo dev
```

Each app runs independently:

```bash
pnpm --filter @sdarm/web dev       # public site
pnpm --filter @sdarm/admin dev     # admin UI
pnpm --filter @sdarm/api dev       # Hono Worker (wrangler dev)
```

## CI / CD

Every push to `main` triggers three sequential jobs:

```
ci (lint + build) → migrate (apply D1 migrations) → deploy-api (wrangler deploy)
```

`apps/web` and `apps/admin` are deployed automatically by Cloudflare Pages via Git integration.

PRs run `lint` and `build` only — no deployment, no migration.

---

## Database — schema changes & migrations

The schema is defined in [`packages/db/src/index.ts`](packages/db/src/index.ts) using Drizzle ORM. Migration files are SQL files committed to [`packages/db/migrations/`](packages/db/migrations/) and applied by Wrangler.

### Workflow for a schema change

**1. Edit the schema**

Open `packages/db/src/index.ts` and make your changes (add a column, new table, etc.).

**2. Generate the migration file**

```bash
cd packages/db
pnpm generate
```

This runs `drizzle-kit generate --dialect=sqlite` and produces a new numbered SQL file in `packages/db/migrations/`, e.g. `0002_add_cover_alt.sql`. Never edit generated files by hand.

**3. Apply locally to verify**

```bash
# From the repo root — targets the local SQLite file, not production
wrangler d1 migrations apply sdarm-db --local
```

Wrangler stores local state at `.wrangler/state/v3/d1/`. Test your changes with `wrangler dev`.

**4. Commit both files**

```bash
git add packages/db/src/index.ts packages/db/migrations/
git commit -m "feat: add cover_alt column to posts"
```

**5. Push to main — CI applies to production automatically**

The `migrate` job in CI runs `wrangler d1 migrations apply sdarm-db` (no `--local`) before the Worker is deployed. Wrangler tracks which migrations have already run and skips them — it is safe to run on every push.

> **Order matters:** migrations always run before the new Worker code is deployed, so the updated schema is in place before any code that depends on it goes live.

### Useful local DB commands

```bash
# List applied migrations
wrangler d1 migrations list sdarm-db --local

# Run a one-off query
wrangler d1 execute sdarm-db --local --command "SELECT * FROM posts WHERE deleted_at IS NULL"

# Inspect the schema
wrangler d1 execute sdarm-db --local --command "SELECT sql FROM sqlite_master WHERE type='table'"
```

### Notes

- **Never use `drizzle-kit push`** — it bypasses migration files and is not tracked
- **Never edit `packages/db/migrations/*.sql` by hand** — regenerate instead
- **Never run `wrangler d1 migrations apply sdarm-db` without `--local`** outside of CI unless you intend to write to production

---

## Secrets

Secrets are managed via `wrangler secret put` or the Cloudflare dashboard. They are never stored in `wrangler.jsonc` or committed to git.

| Secret | Used by |
|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub Actions (CI + deploy + migrate) |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions |
| `CF_ACCESS_CLIENT_ID` | `apps/api` — validates admin route requests |
| `CF_ACCESS_CLIENT_SECRET` | `apps/api` — validates admin route requests |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + `@cloudflare/next-on-pages` |
| API | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle |
| Image storage | Cloudflare R2 |
| Auth | Cloudflare Access (admin) |
| Monorepo | pnpm workspaces + Turborepo 2 |
| Deployment | Cloudflare Git integration + GitHub Actions |

---

## MCP server

The API exposes an OpenAPI spec at `https://api.sdarm.life/api/openapi.json`. You can connect any MCP-compatible AI client (Claude Desktop, Cursor, etc.) to it using [`openapi-mcp-server`](https://github.com/janwilmake/openapi-mcp-server) — no extra code required. Any new routes added to the API automatically appear as MCP tools.

### Setup

Add the following to your MCP client config (e.g. `~/.claude/claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "sdarm-api": {
      "command": "npx",
      "args": [
        "-y",
        "openapi-mcp-server",
        "https://api.sdarm.life/api/openapi.json"
      ]
    }
  }
}
```

This exposes all **public** routes as MCP tools. To also enable **admin** routes (create/edit/delete posts, manage images, config, subscribers), add the auth header:

```json
{
  "mcpServers": {
    "sdarm-api": {
      "command": "npx",
      "args": [
        "-y",
        "openapi-mcp-server",
        "https://api.sdarm.life/api/openapi.json"
      ],
      "env": {
        "HEADER_Authorization": "Bearer <API_KEY>"
      }
    }
  }
}
```

> `API_KEY` is issued via `POST /api/v1/admin/api-keys` (see `apps/api/src/routes/admin/api-keys.ts`). Contact the project owner if you need one.

### How it works

The API is built with [`@hono/zod-openapi`](https://github.com/honojs/middleware/tree/main/packages/zod-openapi), so every route is annotated with its input/output schema. `openapi-mcp-server` reads the live spec and generates one MCP tool per route. No wrapper code to write or maintain — new routes appear automatically.

Interactive spec browser: `https://api.sdarm.life/api/ui`
