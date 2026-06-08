import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { ErrorSchema, OkSchema } from '../schemas';
import { rateLimit } from '../middleware/rate-limit';
import { createBookRequest } from '../repositories/book-requests';

/** Escape user-supplied strings before embedding in HTML email content. */
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
  const { name, email, phone, land, street, plz, city, books, wish, language } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const record = await createBookRequest(db, { name, email, phone, land, street, plz, city, books, wish, language });

  const rows = [
    ['Name', escHtml(name)],
    ['E-Mail', escHtml(email)],
    ['Telefon', escHtml(phone ?? '—')],
    ['Land', escHtml(land)],
    ['Straße', escHtml(street)],
    ['PLZ', escHtml(plz)],
    ['Stadt', escHtml(city)],
    ['Bücher', escHtml(books.join(', '))],
    ['Wunsch', escHtml(wish ?? '—')],
  ]
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#7a7470;font-size:13px;white-space:nowrap">${k}</td><td style="padding:6px 12px;color:#d6d0c8;font-size:13px">${v}</td></tr>`)
    .join('');

  const adminLink = record
    ? `<p style="margin-top:24px"><a href="https://admin.sdarm.life/book-requests/${record.id}" style="color:#c9a96e;font-size:13px">Anfrage #${record.id} im Admin öffnen →</a></p>`
    : '';

  const html = `<!DOCTYPE html><html><body style="background:#0c0b09;font-family:Georgia,serif;padding:32px">
<h2 style="color:#c9a96e;margin-bottom:24px">Neue Buchanfrage</h2>
<table style="border-collapse:collapse;background:#141210;border:1px solid rgba(201,169,110,0.15);border-radius:6px">${rows}</table>
${adminLink}
</body></html>`;

  c.executionCtx.waitUntil(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'info@sdarm.life',
        to: 'info@sdarm.life',
        reply_to: email,
        subject: `Buchanfrage von ${name} (${land})`,
        html,
      }),
    }),
  );

  return c.json({ ok: true as const }, 201);
});

export default router;
