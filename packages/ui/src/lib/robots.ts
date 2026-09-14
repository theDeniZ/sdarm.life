/**
 * Crawl budget is a real running cost on content-heavy sites, not just bandwidth:
 * every page view is a Worker invocation, and Bible pages fan out to the API Worker
 * on top of that, so an unbounded crawl sweep burns the account's daily request quota.
 *
 * This policy distinguishes three classes of crawlers:
 * - **AI answering agents** (ChatGPT-User, Claude-User, etc.) are welcome — they fetch
 *   on behalf of a user asking a question. They receive full access, pointed at
 *   `/llms.txt` for a compact discovery endpoint. Most crawl at human pace (one page
 *   per query); they cost no more than a real visitor.
 * - **Training crawlers** (GPTBot, ClaudeBot, Applebot-Extended, etc.) are refused
 *   outright. They crawl at machine speed and send no readers back.
 * - **SEO/backlink crawlers** (SemrushBot, MJ12bot, etc.) are refused. These tools
 *   index the web to sell backlink reports; nothing here benefits from appearing in
 *   one. Real search crawlers (Googlebot, bingbot) keep full access. Evidence: in
 *   a sampled day of Treasures Worker logs, SemrushBot accounted for 73% of all
 *   requests to the Bible section and MJ12bot a further 12%, against two requests
 *   from Googlebot and one from bingbot — all of it crawling Bible chapter pages
 *   (high crawl cost) that generate no visitor traffic.
 *
 * Both SEO and training crawlers ignore robots.txt voluntarily — the enforcement
 * happens at the WAF (Cloudflare rate-limiting), which stops them before the Worker
 * even invokes. This policy is the first line of defence and sets the contract clear.
 *
 * Content-Signal headers declare the policy to crawlers that understand them:
 * - `search=yes` — indexable for search purposes
 * - `ai-input=yes` — allowed to use in AI model input/training context
 * - `ai-train=no` — not allowed for training of large language models
 *
 * This is a voluntary declaration. There is no enforcement mechanism in HTML/HTTP
 * apart from honesty; the real enforcement (for crawlers that ignore it) lives in
 * the firewall.
 */

const TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Bytespider',
  'Amazonbot',
  'Diffbot',
  'ImagesiftBot',
  'cohere-ai',
  'cohere-training-data-crawler',
];

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

// AI answering agents — user-facing question systems
const AI_ANSWERING_AGENTS = [
  'ChatGPT-User',
  'OAI-SearchBot',
  'Claude-User',
  'Claude-SearchBot',
  'Perplexity-User',
  'PerplexityBot',
  'MistralAI-User',
  'DuckAssistBot',
];

export interface RobotsTxtOptions {
  sitemap?: string;
  disallow: string[];
  agentDisallow?: string[];
}

/**
 * Build a robots.txt file with a shared policy for AI answering agents, training
 * crawlers, and SEO crawlers.
 *
 * - The `*` rule allows general crawling (search engines) with specified disallows.
 * - AI answering agents get full access plus /llms.txt, declared with Content-Signal headers.
 * - Training and SEO crawlers are refused entirely (disallow /).
 * - Optional `agentDisallow` entries are applied to the AI answering agent rule only,
 *   for paths (like individual Bible chapters) where only the answering agent is
 *   excluded but general crawlers remain allowed.
 */
export function buildRobotsTxt(opts: RobotsTxtOptions): string {
  const lines: string[] = [];

  // Rule 1: General crawlers (*)
  lines.push('User-agent: *');
  lines.push('Content-Signal: search=yes, ai-input=yes, ai-train=no');
  lines.push('Allow: /');
  opts.disallow.forEach((path) => lines.push(`Disallow: ${path}`));

  lines.push(''); // blank line

  // Rule 2: AI answering agents — get full access + /llms.txt + Content-Signal
  AI_ANSWERING_AGENTS.forEach((agent) => lines.push(`User-agent: ${agent}`));
  lines.push('Content-Signal: search=yes, ai-input=yes, ai-train=no');
  lines.push('Allow: /llms.txt');
  lines.push('Allow: /');
  opts.disallow.forEach((path) => lines.push(`Disallow: ${path}`));
  if (opts.agentDisallow) {
    opts.agentDisallow.forEach((path) => lines.push(`Disallow: ${path}`));
  }

  lines.push(''); // blank line

  // Rule 3: Training crawlers + SEO crawlers — refuse all
  [...TRAINING_CRAWLERS, ...SEO_CRAWLERS].forEach((agent) => lines.push(`User-agent: ${agent}`));
  lines.push('Disallow: /');

  lines.push(''); // blank line

  // Sitemap, if provided
  if (opts.sitemap) {
    lines.push(`Sitemap: ${opts.sitemap}`);
  }

  return lines.join('\n');
}
