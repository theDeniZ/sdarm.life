import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import { listImages, insertImage, deleteImage } from '../../repositories/images';
import { ErrorSchema, ImageSchema, listOf, OkSchema, PaginationQuery } from '../../schemas';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const listImagesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Admin / Images'],
  security: [{ bearerAuth: [] }],
  request: {
    query: PaginationQuery.extend({
      unused: z.enum(['0', '1']).optional().openapi({ description: 'Show only images not referenced anywhere' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: listOf(ImageSchema) } },
      description: 'Paginated image list with usage info',
    },
  },
});

const deleteImageRoute = createRoute({
  method: 'delete',
  path: '/',
  tags: ['Admin / Images'],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({ key: z.string() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Image deleted from R2 and D1',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing key',
    },
  },
});

const uploadImageRoute = createRoute({
  method: 'post',
  path: '/upload',
  tags: ['Admin / Images'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().openapi({ type: 'string', format: 'binary', description: 'Image file to upload' }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ key: z.string() }) } },
      description: 'R2 object key of the uploaded image',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'No file provided',
    },
  },
});

const backfillRoute = createRoute({
  method: 'post',
  path: '/backfill',
  tags: ['Admin / Images'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ synced: z.number() }) } },
      description: 'Number of R2 objects synced into the images table',
    },
  },
});

router.openapi(listImagesRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { limit, offset, unused } = c.req.valid('query');
  const result = await listImages(db, c.env.KV, {
    limit: limit ?? 24,
    offset: offset ?? 0,
    unusedOnly: unused === '1',
  });
  return c.json(result, 200);
});

router.openapi(deleteImageRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { key } = c.req.valid('query');
  await Promise.all([c.env.IMAGES.delete(key), deleteImage(db, key)]);
  return c.json({ ok: true as const }, 200);
});

// Multipart: use formData() directly — Zod body validation is skipped
router.openapi(uploadImageRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const form = await c.req.formData();
  const file = form.get('file') as File | null;

  if (!file) return c.json({ error: 'No file' }, 400);

  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  await Promise.all([
    c.env.IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    }),
    insertImage(db, key, file.size),
  ]);

  return c.json({ key }, 200);
});

router.openapi(backfillRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const listed = await c.env.IMAGES.list();
  let synced = 0;

  for (const obj of listed.objects) {
    try {
      await insertImage(db, obj.key, obj.size);
      synced++;
    } catch {
      // already exists — skip
    }
  }

  return c.json({ synced }, 200);
});

export default router;
