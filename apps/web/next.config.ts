import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      // add your R2 public bucket hostname here when ready:
      // { protocol: 'https', hostname: 'pub-xxxx.r2.dev' },
    ],
  },
};

export default nextConfig;
