import path from 'path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  transpilePackages: ['@sdarm/ui', '@sdarm/i18n'],
  images: {
    unoptimized: true,
    // images.unsplash.com and upload.wikimedia.org are deliberately absent. They
    // were allowed for the hotlinked fallback images this app no longer has; an
    // allowlist that still names them lets the next `<Image src="https://…">`
    // reintroduce the IP leak without anyone noticing (docs/dsgvo.md, gap 2).
    // Images come from our own R2 — add a host here only with a DSGVO answer.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.sdarm.life' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
