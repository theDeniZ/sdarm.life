import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../types';
import { ErrorSchema, OkSchema } from '../schemas';
import { rateLimit } from '../middleware/rate-limit';
import { bookRequestEmail, bookRequestSubject } from '../emails/book-request';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

// 2 book requests per IP per minute — prevents email spam to info@sdarm.life
router.use('/book-request', rateLimit('br', 2));

const bookRequestRoute = createRoute({
  method: 'post',
  path: '/book-request',
  tags: ['Books'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1),
            email: z.string().email(),
            phone: z.string().optional(),
            land: z.enum(['DE', 'AT', 'CH']),
            street: z.string().min(1),
            plz: z.string().min(1),
            city: z.string().min(1),
            religion: z.string().optional(),
            books: z.array(z.string()).min(1),
            wish: z.string().optional(),
            language: z.enum(['de', 'en']).optional(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: OkSchema } },
      description: 'Book request received',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Invalid request',
    },
  },
});

router.openapi(bookRequestRoute, async (c) => {
  const { name, email, phone, land, street, plz, city, religion, books, wish } = c.req.valid('json');

  const fields = { name, email, phone, land, street, plz, city, religion, books, wish };

  c.executionCtx.waitUntil(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'info@sdarm.life',
        to: 'info@sdarm.life',
        reply_to: email,
        subject: bookRequestSubject(fields),
        html: bookRequestEmail(fields),
      }),
    }),
  );

  return c.json({ ok: true as const }, 201);
});

export default router;
