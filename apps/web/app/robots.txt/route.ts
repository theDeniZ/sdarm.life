import { buildRobotsTxt } from '@sdarm/ui';

export const dynamic = 'force-static';

export function GET() {
  const txt = buildRobotsTxt({
    sitemap: 'https://sdarm.life/sitemap.xml',
    disallow: ['/api/', '/_next/'],
  });

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
