import { z } from '@hono/zod-openapi';

export const PostSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().nullable(),
    body: z.string().nullable(),
    author: z.string().nullable(),
    videoUrl: z.string().nullable(),
    coverKey: z.string().nullable(),
    coverAlt: z.string().nullable(),
    thumbKey: z.string().nullable(),
    isFeatured: z.boolean(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string().nullable(),
  })
  .openapi('Post');

export const ImageUsedInSchema = z.object({ type: z.string(), label: z.string() });

export const ImageSchema = z
  .object({
    key: z.string(),
    size: z.number(),
    uploaded: z.string(),
    usedIn: z.array(ImageUsedInSchema),
  })
  .openapi('Image');

export const SubscriberSchema = z
  .object({
    id: z.number(),
    email: z.string(),
    createdAt: z.string(),
  })
  .openapi('Subscriber');

export const OkSchema = z.object({ ok: z.literal(true) });
export const ErrorSchema = z.object({ error: z.string() });

export const PaginationQuery = z.object({
  limit: z.coerce.number().optional().openapi({ example: 20 }),
  offset: z.coerce.number().optional().openapi({ example: 0 }),
});

export function listOf<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ items: z.array(schema), total: z.number() });
}
