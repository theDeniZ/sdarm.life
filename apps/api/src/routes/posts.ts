import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { listPosts, getPostBySlug } from '../repositories/posts';
import { ErrorSchema, listOf, PaginationQuery, PostSchema } from '../schemas';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const listPostsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Posts'],
  request: {
    query: PaginationQuery.extend({
      featured: z.enum(['0', '1']).optional().openapi({ description: 'Filter to featured posts only' }),
      video: z.enum(['0', '1']).optional().openapi({ description: 'Filter to posts with a video URL' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: listOf(PostSchema) } },
      description: 'Paginated list of active posts',
    },
  },
});

const getPostRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  tags: ['Posts'],
  request: {
    params: z.object({ slug: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: PostSchema } },
      description: 'Single post',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Post not found',
    },
  },
});

router.openapi(listPostsRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { featured, video, limit, offset } = c.req.valid('query');
  const { items, total } = await listPosts(db, {
    featured: featured === '1',
    video: video === '1',
    limit,
    offset: offset ?? 0,
  });
  return c.json({ items, total }, 200);
});

router.openapi(getPostRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const post = await getPostBySlug(db, c.req.valid('param').slug);
  if (!post || post.deletedAt) return c.json({ error: 'Not found' }, 404);
  return c.json(post, 200);
});

export default router;
