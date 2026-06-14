# sdarm.life — Claude Context

Following 4 rules are imperative to follow at all times:
1. Don’t assume. Don’t hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.

⚠️ **CRITICAL RULE:** All Claude documentation files, comments, and content must be written in **English only**. No exceptions. German, French, or any other language is forbidden in these files. (The user-facing web content in `apps/` uses `de` and `en` — this rule applies to dev context only.)

---

Content-driven web app for an SDA Reform church. Monorepo hosted entirely on Cloudflare.

## Apps

| Package | URL | Stack |
|---|---|---|
| `@sdarm/web` | `sdarm.life` | Next.js 16 public site |
| `@sdarm/admin` | `admin.sdarm.life` | Next.js 16 admin UI |
| `@sdarm/api` | `api.sdarm.life` | Hono Cloudflare Worker |
| `@sdarm/events` | `events.sdarm.life` | Next.js 16 events landing page |
| `@sdarm/treasures` | `treasures.sdarm.life` | Next.js 16 analog treasures site |
| `@sdarm/songbook` | `songs.sdarm.life` | Next.js 16 songbook site |
| `@sdarm/db` | — | Drizzle schema + migrations (shared) |
| `@sdarm/types` | — | Shared API response DTO interfaces |
| `@sdarm/ui` | — | Shared React components + dark museum CSS design system |
| `@sdarm/i18n` | — | Shared i18n config (locales, messages) — used by all public apps via `next-intl` |

**Tooling:** pnpm workspaces + Turborepo 2. Build: `pnpm turbo build`.

## Cloudflare resources

| Resource | Name/ID |
|---|---|
| D1 database | `sdarm-db` — ID `8d498e81-689f-45ac-9128-46106dd87e2d` |
| R2 bucket | `sdarm-images` |
| KV namespace | `sdarm-kv` — stores site config as single JSON key |
| Worker | `sdarm-api` |
| Worker | `sdarm-web` |
| Worker | `sdarm-admin` |
| Worker | `sdarm-events` |
| Worker | `sdarm-treasures` |
| Worker | `sdarm-songbook` |

Worker bindings (`apps/api/wrangler.jsonc`): `DB` (D1), `IMAGES` (R2), `KV` (KV namespace). Secrets: `API_KEY`, `RESEND_API_KEY`, `CF_ZONE_ID?`, `CF_PURGE_TOKEN?`.

## Domain routing

| Subdomain | App | Protection |
|---|---|---|
| `sdarm.life` | `apps/web` | Public |
| `admin.sdarm.life` | `apps/admin` | Cloudflare Access (Google login, email allowlist) |
| `api.sdarm.life` | `apps/api` | Public GETs; `/admin/*` requires header secrets |
| `images.sdarm.life` | R2 public bucket | Public |
| `events.sdarm.life` | `apps/events` | Public |
| `treasures.sdarm.life` | `apps/treasures` | Public |
| `songs.sdarm.life` | `apps/songbook` | Public |

⚠️ **Reference for manual git work:** @docs/gitflow.md — guidelines for how you work with git. Claude does not automatically commit or push.

@docs/schema.md
@docs/api.md
@docs/frontend.md
@docs/architecture.md
@docs/conventions.md
@docs/gotchas.md
@docs/dsgvo.md
@docs/testing.md

## Agent patterns

Use parallel subagents when work is independently executable across the monorepo.
The `Agent` tool with `isolation: "worktree"` gives each agent its own git working copy — no merge conflicts mid-task.

### When TO spawn agents

| Scenario | Pattern |
|---|---|
| New feature touches multiple apps (API + web + admin + i18n) | 4 parallel agents, each owns one app |
| Heavy codebase research before implementation | `Explore` agent first → findings → implement in main |
| Redesign component A while adding feature to component B | 2 parallel agents with `isolation: "worktree"` |
| DB migration + route + frontend all needed at once | Sequential agents: migration first, then parallel route + frontend |

### When NOT to spawn agents

- Single-file edit or small bug fix
- Work that is strictly sequential (migration must apply before the route can be written)
- Anything under ~30 min of work — overhead isn't worth it

### Monorepo agent split for large features

```
1. Explore agent      — reads codebase, returns file map + contract decisions
2. API agent          — packages/db schema + migration + apps/api route (--worktree)
3. Web agent          — apps/web page + components (--worktree)
4. Admin agent        — apps/admin UI (--worktree, if needed)
5. i18n agent         — packages/i18n/src/messages/de.json + en.json (--worktree)
Main agent            — reviews all diffs, resolves conflicts, commits
```

### Example invocation

```ts
// Research first (foreground, no worktree)
Agent({ subagent_type: "Explore", prompt: "Find all places that reference X..." })

// Then parallel implementation (background, isolated)
Agent({ prompt: "Add route POST /api/v1/...", isolation: "worktree", run_in_background: true })
Agent({ prompt: "Add page /[locale]/...",    isolation: "worktree", run_in_background: true })
```

### This monorepo's shared boundaries

Agents must respect package boundaries — never import across apps.
Shared code changes (`packages/db`, `packages/types`, `packages/i18n`) must be done by **one agent only** (usually API agent) to avoid conflicts. Other agents wait for that diff before starting.
