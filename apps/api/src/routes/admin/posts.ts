import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { getPostById, createPost, updatePost, softDeletePost } from '../../repositories/posts';
import { ErrorSchema, OkSchema, PostSchema } from '../../schemas';
import { purgeCache } from '../../middleware/cache';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const IdParam = z.object({ id: z.coerce.number() });

const CreatePostBody = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  author: z.string().optional(),
  videoUrl: z.string().optional(),
  coverKey: z.string().optional(),
  coverAlt: z.string().optional(),
  thumbKey: z.string().optional(),
  isFeatured: z.boolean().optional(),
  publishedAt: z.string().optional(),
});

const UpdatePostBody = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  coverKey: z.string().nullable().optional(),
  coverAlt: z.string().nullable().optional(),
  thumbKey: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  publishedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
});

const getPostRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Admin / Posts'],
  security: [{ bearerAuth: [] }],
  request: { params: IdParam },
  responses: {
    200: {
      content: { 'application/json': { schema: PostSchema } },
      description: 'Single post by ID',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Not found',
    },
  },
});

const createPostRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Admin / Posts'],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreatePostBody } }, required: true },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: PostSchema } },
      description: 'Created post',
    },
  },
});

const updatePostRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Admin / Posts'],
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParam,
    body: { content: { 'application/json': { schema: UpdatePostBody } }, required: true },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: PostSchema } },
      description: 'Updated post',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Not found',
    },
  },
});

const deletePostRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Admin / Posts'],
  security: [{ bearerAuth: [] }],
  request: { params: IdParam },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Soft-deleted',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Not found',
    },
  },
});

router.openapi(getPostRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const post = await getPostById(db, c.req.valid('param').id);
  if (!post) return c.json({ error: 'Not found' }, 404);
  return c.json(post, 200);
});

router.openapi(createPostRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const post = await createPost(db, c.req.valid('json'));
  const origin = new URL(c.req.url).origin;
  purgeCache(c.executionCtx, origin, [
    '/api/v1/posts',
    '/api/v1/posts?featured=1',
    '/api/v1/posts?limit=8',
    '/api/v1/posts?limit=5',
  ], c.env);
  return c.json(post, 201);
});

router.openapi(updatePostRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const post = await updatePost(db, c.req.valid('param').id, c.req.valid('json'));
  if (!post) return c.json({ error: 'Not found' }, 404);
  const origin = new URL(c.req.url).origin;
  purgeCache(c.executionCtx, origin, [
    '/api/v1/posts',
    '/api/v1/posts?featured=1',
    '/api/v1/posts?limit=8',
    '/api/v1/posts?limit=5',
    `/api/v1/posts/${post.slug}`,
  ], c.env);
  return c.json(post, 200);
});

router.openapi(deletePostRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const post = await softDeletePost(db, c.req.valid('param').id);
  if (!post) return c.json({ error: 'Not found' }, 404);
  const origin = new URL(c.req.url).origin;
  purgeCache(c.executionCtx, origin, [
    '/api/v1/posts',
    '/api/v1/posts?featured=1',
    '/api/v1/posts?limit=8',
    '/api/v1/posts?limit=5',
    `/api/v1/posts/${post.slug}`,
  ], c.env);
  return c.json({ ok: true as const }, 200);
});

export default router;
