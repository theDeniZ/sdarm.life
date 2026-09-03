import type { MetadataRoute } from 'next';

/* Crawl budget is a real running cost here, not just bandwidth: every page view
 * is a Worker invocation and every Bible page fans out to the API Worker on top
 * of it, so an unbounded sweep of the Bible tree burns the account's daily
 * request quota. Two rules follow.
 *
 * `?compare=` and `?projector=` are utility variants of a page that already
 * exists at its plain URL (both carry a canonical pointing there), so crawling
 * them buys nothing and doubles the surface.
 *
 * The AI crawlers and the SEO/backlink crawlers take the whole tree at machine
 * speed and send no readers back, so they are refused outright. Real search
 * crawlers keep full access to the readable pages. Both rules are honoured
 * voluntarily — the crawlers that ignore robots.txt have to be stopped at the
 * WAF instead.
 *
 * The SEO list is not hypothetical: in a sampled day of Worker logs SemrushBot
 * accounted for 73% of all requests to this app and MJ12bot for a further 12%,
 * all of it inside `/bible/`, against two requests from Googlebot and one from
 * bingbot. These tools index the web to sell backlink reports; nothing here
 * benefits from being in one.
 */
const SEO_CRAWLERS = [
  'SemrushBot',
  'MJ12bot',
  'AhrefsBot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Barkrowler',
  'SerpstatBot',
  'ZoominfoBot',
];

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'PerplexityBot',
  'Bytespider',
  'Amazonbot',
  'Applebot-Extended',
  'meta-externalagent',
  'Google-Extended',
  'Diffbot',
  'ImagesiftBot',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/_next/', '/*?compare=', '/*?projector='],
      },
      {
        userAgent: [...AI_CRAWLERS, ...SEO_CRAWLERS],
        disallow: '/',
      },
    ],
    sitemap: 'https://treasures.sdarm.life/sitemap.xml',
  };
}
