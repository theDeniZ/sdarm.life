import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { ErrorSchema, SongSchema } from '../schemas';
import * as repo from '../repositories/songs';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const getSongRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Songbooks'],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: { content: { 'application/json': { schema: SongSchema } }, description: 'Full song with parts and sheets' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
  },
});

router.openapi(getSongRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const song = await repo.getSongById(db, c.req.valid('param').id);
  if (!song) return c.json({ error: 'Not found' }, 404);
  return c.json(song, 200);
});

export default router;
