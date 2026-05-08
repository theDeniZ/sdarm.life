FROM node:20-bookworm

# Install additional system dependencies and dev tools
RUN apt-get update && apt-get install -y --no-install-recommends \
	git \
	git-lfs \
	curl \
	bash \
	openssl \
	ca-certificates \
	tar \
	gzip \
	python3 \
	make \
	g++ \
	# Playwright browser dependencies
	libnss3 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libcups2 \
	libdrm2 \
	libxkbcommon0 \
	libxcomposite1 \
	libxdamage1 \
	libxfixes3 \
	libxrandr2 \
	libgbm1 \
	libasound2 \
	libpango-1.0-0 \
	libcairo2 \
	libx11-6 \
	libxext6 \
	fonts-liberation \
	&& rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@10.32.0

# Git credential helper and LFS
RUN git config --system credential.helper store && \
    git lfs install --system

# Set up npm cache directory for better caching
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node/.npm

# Create Claude Code data directory so Docker initializes the named volume
# with node:node ownership. Without this the volume mount point is root-owned
# and tar fails with "Permission denied" during the backup restore.
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/.claude

USER node

WORKDIR /workspaces/sdarm.life
