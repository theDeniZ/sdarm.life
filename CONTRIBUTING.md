# Contributing

Technical standards for the sdarm.life monorepo.

## Documentation

| File | Contents |
|---|---|
| [docs/schema.md](docs/schema.md) | DB schema, config keys, migration rules |
| [docs/api.md](docs/api.md) | API routes, auth model, response contract, API conventions |
| [docs/frontend.md](docs/frontend.md) | Component maps (web + admin), Next.js rules, data flow, images |
| [docs/architecture.md](docs/architecture.md) | Target file structure, shared types, repository pattern, state management |
| [docs/conventions.md](docs/conventions.md) | TypeScript, styling, env vars, shared code rules |
| [docs/gotchas.md](docs/gotchas.md) | Known pitfalls and build constraints |

## Commits

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. Subject line under 72 characters, no trailing period.

## Pull requests

- PRs against `main` run `lint` and `build` — no deployment, no migration
- Migrations run automatically on push to `main` via CI
- Keep PRs focused: one concern per PR
