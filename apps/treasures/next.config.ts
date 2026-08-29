import os from 'os';
import path from 'path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const SBL_URL = process.env.SBL_URL ?? 'https://sbl.sdarm.life';

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
  async redirects() {
    /* The Sabbath Bible Lesson was a route of this app in 1.4.0 and now has its
       own host. That version is live and the route is in the sitemap, so the
       address has been shared and crawled — it must lead somewhere rather than
       404. Permanent (308), so a crawler transfers what it knows about the page
       to the new host instead of holding two records. */
    return [{ source: '/:locale/sbl', destination: SBL_URL, permanent: true }];
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
