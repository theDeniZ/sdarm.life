FROM node:20-bookworm

# Install additional system dependencies and dev tools
RUN apt-get update && apt-get install -y --no-install-recommends \
	git \
	curl \
	bash \
	openssl \
	ca-certificates \
	tar \
	gzip \
	python3 \
	make \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@10.32.0

# Git credential helper for better Git integration
RUN git config --system credential.helper store

# Set up npm cache directory for better caching
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node/.npm

USER node

WORKDIR /workspaces/sdarm.life
