# sdarm.life — Claude Context

Content-driven web app for an SDA Reform church. Monorepo hosted entirely on Cloudflare.

## Apps

| Package | URL | Stack |
|---|---|---|
| `@sdarm/web` | `sdarm.life` | Next.js 15 public site |
| `@sdarm/admin` | `admin.sdarm.life` | Next.js 15 admin UI |
| `@sdarm/api` | `api.sdarm.life` | Hono Cloudflare Worker |
| `@sdarm/db` | — | Drizzle schema + migrations (shared) |

**Tooling:** pnpm workspaces + Turborepo 2. Build: `pnpm turbo build`.

## Cloudflare resources

| Resource | Name/ID |
|---|---|
| D1 database | `sdarm-db` — ID `8d498e81-689f-45ac-9128-46106dd87e2d` |
| R2 bucket | `sdarm-images` |
| KV namespace | `sdarm-kv` — stores site config as single JSON key |
| Worker | `sdarm-api` |
| Pages (web) | `sdarm-web` |
| Pages (admin) | `sdarm-admin` |

Worker bindings (`apps/api/wrangler.jsonc`): `DB` (D1), `IMAGES` (R2), `KV` (KV namespace), `CF_CLIENT_ID` (secret), `CF_CLIENT_SECRET` (secret).

## Domain routing

| Subdomain | App | Protection |
|---|---|---|
| `sdarm.life` | `apps/web` | Public |
| `admin.sdarm.life` | `apps/admin` | Cloudflare Access (Google login, email allowlist) |
| `api.sdarm.life` | `apps/api` | Public GETs; `/admin/*` requires header secrets |
| `images.sdarm.life` | R2 public bucket | Public |

@docs/schema.md
@docs/api.md
@docs/frontend.md
@docs/architecture.md
@docs/conventions.md
@docs/gotchas.md
