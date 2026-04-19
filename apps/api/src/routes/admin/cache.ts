import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../../types';
import { purgeCache } from '../../middleware/cache';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const BodySchema = z
  .object({
    paths: z.array(z.string()).optional().openapi({
      description:
        'Specific paths to purge (must start with /api/v1). When omitted, purges the full song + songbook cache set — useful after direct D1 edits that bypass the admin API.',
      example: ['/api/v1/songbooks/breezify/songs'],
    }),
  })
  .openapi('CachePurgeBody');

const ResponseSchema = z
  .object({
    purged: z.number(),
    paths: z.array(z.string()),
  })
  .openapi('CachePurgeResponse');

/**
 * Default purge set used when the caller sends no paths. Covers every cached
 * endpoint that new/changed songs affect: songbook list + details (song
 * counts), the per-songbook song lists, individual song pages are not
 * enumerated (there are many) — call this with `paths: ['/api/v1/songs/ID']`
 * explicitly when you know which one needs flushing.
 */
function defaultSongPurgeSet(): string[] {
  return [
    '/api/v1/songbooks',
    '/api/v1/songs/recent',
    '/api/v1/songs/search',
  ];
}

router.openapi(
  createRoute({
    method: 'post',
    path: '/purge',
    tags: ['Admin / Cache'],
    security: [{ bearerAuth: [] }],
    summary: 'Manually purge cached API responses',
    description:
      'Escape hatch for cases where the DB was edited outside the admin API (direct D1 CLI, CF dashboard). Admin API mutations already purge automatically — this is only needed when the automatic path was bypassed.',
    request: {
      body: { content: { 'application/json': { schema: BodySchema } }, required: false },
    },
    responses: {
      200: { content: { 'application/json': { schema: ResponseSchema } }, description: 'Purged' },
    },
  }),
  async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as z.infer<typeof BodySchema>;
    const paths =
      body.paths && body.paths.length > 0 ? body.paths : defaultSongPurgeSet();
    const origin = new URL(c.req.url).origin;
    purgeCache(c.executionCtx, origin, paths, c.env);
    return c.json({ purged: paths.length, paths }, 200);
  },
);

export default router;
