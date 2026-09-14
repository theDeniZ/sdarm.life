import { buildRobotsTxt } from '@sdarm/ui';

export const dynamic = 'force-static';

export function GET() {
  const txt = buildRobotsTxt({
    sitemap: 'https://treasures.sdarm.life/sitemap.xml',
    disallow: ['/_next/', '/*?compare=', '/*?projector='],
    // Chapter pages are high-cost (each is a Worker invocation + API call for verse text);
    // AI agents get the Bible as complete books via the API instead (/api/v1/llm/bible)
    agentDisallow: ['/*/bible/*/*/'],
  });

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
