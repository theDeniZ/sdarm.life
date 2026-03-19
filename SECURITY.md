# Security Policy

## Supported Versions

This is a continuously deployed project. Only the latest version running on `sdarm.life` is supported.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing the maintainers directly. Include as much detail as possible:

- Description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept
- Affected component (`apps/web`, `apps/admin`, `apps/api`, etc.)
- Any suggested mitigations

You can expect an acknowledgement within **72 hours** and a resolution or status update within **14 days**.

## Scope

### In scope

- Authentication bypass on `/api/v1/admin/*` routes
- Unauthorized access to the admin UI (`admin.sdarm.life`)
- Injection vulnerabilities (SQL, command, header injection) in the API Worker
- Exposure of secrets (API keys, Cloudflare credentials) through any surface
- Cross-site scripting (XSS) in admin or public pages
- Insecure direct object references — accessing or mutating other users' data
- R2 bucket misconfiguration allowing unauthorized write/delete
- Workers KV data exposure

### Out of scope

- Cloudflare platform-level vulnerabilities (report to [Cloudflare](https://www.cloudflare.com/disclosure/))
- Rate limiting / denial-of-service on public read endpoints (no auth, no sensitive data)
- Self-XSS or attacks requiring physical access to the victim's device
- Theoretical vulnerabilities with no practical exploit path
- Issues in dependencies — report those upstream

## Security Architecture

### Authentication

Admin routes (`/api/v1/admin/*`) require `Authorization: Bearer <key>` on every request. Keys are SHA-256 hashed and stored in Workers KV; the raw key is never persisted. A bootstrap `API_KEY` Worker secret serves as a fallback for initial setup only.

The admin UI (`admin.sdarm.life`) is additionally protected by Cloudflare Access (Google login with an email allowlist) as a second layer.

### Secrets management

- All secrets are stored as Cloudflare Worker secrets or GitHub Actions secrets — never in source code or `wrangler.jsonc`
- Local development uses `.dev.vars` (gitignored) with placeholder values (`dev`)
- CI syncs secrets to the Worker via `wrangler secret put` on every deploy to `main`

### Data storage

- **D1 (SQLite)** — structured data; queries use Drizzle ORM with parameterised statements
- **R2** — binary blobs (images, PDFs); no direct public write access
- **Workers KV** — site configuration; write access restricted to admin API routes

### CORS

Allowed origins are explicitly allowlisted: `https://sdarm.life`, `https://admin.sdarm.life`, `http://localhost:3000`, `http://localhost:3001`. No wildcard origins.
