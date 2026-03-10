import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

if (process.env.NODE_ENV === 'development') {
  import('@cloudflare/next-on-pages/next-dev').then(({ setupDevPlatform }) => setupDevPlatform());
}

export default nextConfig;
