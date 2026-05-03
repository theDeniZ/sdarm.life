#!/bin/bash
set -e

echo "🚀 Setting up sdarm.life dev environment..."

# Initialize Git LFS
echo "🗄️  Initializing Git LFS..."
git lfs install
echo "✅ Git LFS initialized"

# Install project dependencies
echo "📚 Installing project dependencies..."
pnpm install

# Generate Wrangler types for the API
echo "🔧 Generating Wrangler types for API..."
pnpm --filter @sdarm/api cf-typegen

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
pnpm exec playwright install chromium
echo "✅ Playwright browsers installed"

# Build packages
echo "🏗️ Building packages (db, types)..."
pnpm --filter './packages/**' build

# Create .env.local files for local development if they don't exist
echo "⚙️ Creating env files..."

if [ ! -f apps/api/.dev.vars ]; then
	cat > apps/api/.dev.vars << 'EOF'
# Worker secrets for local development
API_KEY=dev
EOF
	echo "✅ Created apps/api/.dev.vars"
fi

if [ ! -f apps/web/.env.local ]; then
	cat > apps/web/.env.local << 'EOF'
# Add any local env vars for web app here
NEXT_PUBLIC_API_URL=http://localhost:8787
EOF
	echo "✅ Created apps/web/.env.local"
fi

if [ ! -f apps/admin/.env.local ]; then
	cat > apps/admin/.env.local << 'EOF'
# Server-side only — the admin Next.js app proxies requests through
# /app/api/v1/[...path]/route.ts, which attaches Authorization server-side.
# Never use NEXT_PUBLIC_* for API_KEY: it would leak into the browser bundle.
API_URL=http://localhost:8787
API_KEY=dev
NEXT_PUBLIC_R2_URL=http://localhost:8787/api/v1/images
EOF
	echo "✅ Created apps/admin/.env.local"
fi

# Set up RTK (Rust Token Killer) for Claude Code integration
echo "🎯 Setting up RTK for Claude Code..."
if command -v rtk &> /dev/null; then
	# Optionally initialize RTK hook globally for Claude Code
	# Uncomment the line below to enable auto-rewrite of commands
	# rtk init --global --hook-only
	
	echo "✅ RTK is available: $(rtk --version)"
	echo "   To enable auto-command optimization in Claude Code, run:"
	echo "   rtk init --global"
else
	echo "⚠️  RTK not found (will be installed in Dockerfile)"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Available commands:"
echo "  pnpm turbo dev      - Start all dev servers (web, admin, api)"
echo "  pnpm dev           - Start all apps concurrently"
echo "  pnpm --filter @sdarm/web dev      - Start web only"
echo "  pnpm --filter @sdarm/admin dev    - Start admin only"
echo "  pnpm --filter @sdarm/api dev      - Start API (Wrangler) only"
echo "  pnpm turbo lint    - Lint all packages"
echo "  pnpm turbo build   - Build all packages"
echo ""
echo "RTK Commands (token optimization for LLM):"
echo "  rtk gain           - View token savings stats"
echo "  rtk init --global  - Enable auto-rewrite hook for Claude Code"
echo ""
