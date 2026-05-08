import path from 'path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.sdarm.life' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

if (process.env.NODE_ENV === 'development') {
  import('@cloudflare/next-on-pages/next-dev').then(({ setupDevPlatform }) => setupDevPlatform());
}

export default withNextIntl(nextConfig);
