import { Hono } from 'hono';
import type { Bindings } from '../types';

/**
 * `robots.txt` on the API host. Plain text, no OpenAPI contract — same
 * exclusion reasoning as `routes/og.ts` and `routes/llm.ts`.
 *
 * `Content-Signal` opts every crawler out of AI training by default (the `*`
 * group) while still allowing search indexing; the named AI answer-engine
 * bots get an explicit `Allow` for the two agent-Markdown entry points so
 * they can read `llms.txt` / `/api/v1/llm` without being blanket-disallowed
 * by the `*` group below them.
 */
const router = new Hono<{ Bindings: Bindings }>();

const BODY = `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Disallow: /

User-agent: ChatGPT-User
User-agent: OAI-SearchBot
User-agent: Claude-User
User-agent: Claude-SearchBot
User-agent: Perplexity-User
User-agent: PerplexityBot
User-agent: MistralAI-User
User-agent: DuckAssistBot
Allow: /llms.txt
Allow: /api/v1/llm
Disallow: /
`;

router.get('/', (c) => c.text(BODY, 200, { 'Cache-Control': 'public, max-age=86400' }));

export default router;
