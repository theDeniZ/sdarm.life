# Dev Container Setup for sdarm.life

This project is configured to run in a VS Code Dev Container, providing a consistent development environment with all required tools.

## Features

- **Node.js 20** - LTS version matching CI/production
- **pnpm 10.32.0** - Package manager configured in post-create hook
- **Turborepo 2** - Monorepo management
- **Git & GitHub CLI** - Version control tools
- **RTK (Rust Token Killer)** - Token optimization for LLM contexts
- **VS Code Extensions** - Pre-configured for TypeScript, ESLint, Prettier, Tailwind

## Quick Start

### Prerequisites
- Docker Desktop (or similar OCI-compatible container runtime)
- VS Code with Remote Containers extension

### Launch Dev Container

1. **Open the project in VS Code**
   ```bash
   code /path/to/sdarm.life
   ```

2. **Open in Dev Container**
   - Press `Cmd+Shift+P` (mac) or `Ctrl+Shift+P` (windows/linux)
   - Type "Dev Containers: Reopen in Container"
   - Wait for the container to build and boot (first time takes 2-3 minutes)

3. **Container comes with auto-setup**
   - pnpm 10.32.0 installed globally
   - All project dependencies installed
   - Environment files (.env.local) scaffolded
   - Wrangler types generated

## Available Commands

```bash
# Start all dev servers simultaneously (ports 3000, 3001, 8787)
pnpm turbo dev

# Individual app development
pnpm --filter @sdarm/web dev      # Next.js web app (port 3000)
pnpm --filter @sdarm/admin dev    # Next.js admin app (port 3001)
pnpm --filter @sdarm/api dev      # Wrangler API worker (port 8787)

# Linting & Building
pnpm turbo lint      # Lint all packages
pnpm turbo build     # Build all packages
pnpm --filter ./packages build  # Build only packages (db, types)

# Testing
pnpm --filter @sdarm/api test    # Run API tests with Vitest
```

## Port Mapping

| Port | Service | URL |
|------|---------|-----|
| 3000 | Web App | http://localhost:3000 |
| 3001 | Admin App | http://localhost:3001 |
| 8787 | Wrangler Dev (API) | http://localhost:8787 |

## Environment Files

The post-create hook scaffolds these files (you can customize after creation):

- **`apps/api/.dev.vars`** - Cloudflare secrets for local development
- **`apps/web/.env.local`** - Web app environment variables
- **`apps/admin/.env.local`** - Admin app environment variables

For local Cloudflare integration, add your credentials to `apps/api/.dev.vars`:
```
CF_CLIENT_ID=your_id
CF_CLIENT_SECRET=your_secret
```

## VS Code Extensions

Pre-installed in the container:
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind utilities
- **Vitest Explorer** - Test runner UI
- **GitHub Copilot** - (optional, sign in as needed)

## RTK Integration

[**RTK (Rust Token Killer)**](https://github.com/rtk-ai/rtk) is included to optimize LLM token consumption. It reduces tokens by 60-90% on common dev commands by filtering, grouping, and truncating output.

### Quick Start with RTK

```bash
# View your token savings so far
rtk gain

# Enable auto-rewrite hook for Claude Code (recommended)
# This transparently rewrites commands to RTK equivalents
rtk init --global

# Restart Claude Code, then verify with:
git status    # Auto-rewrites to: rtk git status
```

### RTK Commands

```bash
# File operations
rtk ls .                    # Compact directory tree
rtk read file.ts           # Smart file reading
rtk grep "pattern" .       # Grouped search results
rtk find "*.ts" .          # Compact find results

# Git operations
rtk git status             # Compact status
rtk git diff               # Condensed diff
rtk git log -n 10          # One-line commits
rtk git add/commit/push    # Minimal output

# Build & Test
rtk lint                   # ESLint grouped by rule
rtk tsc                    # TypeScript errors grouped
rtk test npm run build     # Show failures only (-90%)
rtk vitest run             # Vitest compact

# Package managers
rtk pnpm list              # Compact dependency tree

# Analytics
rtk gain                   # View cumulative token savings
rtk gain --graph           # ASCII graph (last 30 days)
rtk discover               # Find missed opportunities
```

### Configuration

RTK config file: `~/.config/rtk/config.toml` (macOS: `~/Library/Application Support/rtk/config.toml`)

Disable auto-rewrite for specific commands:
```toml
[hooks]
exclude_commands = ["curl", "wget"]
```

### Troubleshooting RTK

```bash
# Verify installation
rtk --version

# Check tracking database
rtk gain --all

# Uninstall hook (keep RTK binary)
rtk init --global --uninstall

# Uninstall completely
rtk init -g --uninstall
cargo uninstall rtk
```

## Troubleshooting

### Container won't build
```bash
# Rebuild from scratch
# In VS Code: Dev Containers: Rebuild Container
# Or manually:
docker system prune -a
# Then reopen in container
```

### pnpm permission issues
```bash
# Inside container, reset pnpm:
pnpm store prune
pnpm install
```

### Port conflicts
If ports 3000, 3001, or 8787 are in use:
1. Update port mappings in `devcontainer.json`
2. Update individual `package.json` dev scripts (e.g., `--port 3002`)

### Slow initial build
First-time setup installs Node modules for the monorepo. This usually takes 1-2 minutes depending on internet speed.

## Persistent SSH Keys

SSH keys from your host machine (`~/.ssh`) are mounted read-only into the container, enabling Git operations to use your existing SSH configuration.

## Further Documentation

- [Project Architecture](../../docs/architecture.md)
- [API Documentation](../../docs/api.md)
- [Frontend Guidelines](../../docs/frontend.md)
- [Development Conventions](../../docs/conventions.md)
