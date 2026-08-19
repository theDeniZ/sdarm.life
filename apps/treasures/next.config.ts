import os from 'os';
import path from 'path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
/* the lesson is the one page here whose data is fetched from the browser */
const isLocal = API.includes('localhost') || API.includes('127.0.0.1');

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  /* `next dev` refuses to serve its own dev resources to a page opened on any
   * host but localhost. Reached through a container IP or a forwarded cloud
   * URL the HTML arrives, the HMR socket is refused and hydration never runs —
   * a page that looks broken rather than blocked. The addresses are read from
   * the machine because a container's IP differs between machines. Note this
   * list takes hosts and globs: a CIDR range is silently ignored. */
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    ...Object.values(os.networkInterfaces())
      .flat()
      .filter((n): n is os.NetworkInterfaceInfo => !!n && n.family === 'IPv4' && !n.internal)
      .map((n) => n.address),
    '*.app.github.dev',
    '*.githubpreview.dev',
    '*.gitpod.io',
  ],
  async rewrites() {
    /* Local development only: the dev servers live in a container and reach the
       browser through forwarded ports. Serving the page from one port and its
       data from another means a single missing forward leaves the sheet up and
       empty. In production the browser calls the API host directly. */
    if (!isLocal) return [];
    return [{ source: '/api/v1/sbl/:path*', destination: `${API}/sbl/:path*` }];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.sdarm.life' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
