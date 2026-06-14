import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../types';
import { createSubscriber, unsubscribeByToken, confirmSubscriber } from '../repositories/subscribers';
import { ErrorSchema, OkSchema } from '../schemas';
import { welcomeEmail } from '../emails/welcome';
import { confirmEmail } from '../emails/confirm';
import { rateLimit } from '../middleware/rate-limit';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const FROM = 'info@sdarm.life';
const WEB_ORIGIN = 'https://sdarm.life';

// 3 subscribe attempts per IP per minute — prevents Resend quota exhaustion
router.use('/subscribe', rateLimit('sub', 3));
// 10 confirm attempts per IP per minute — prevents token brute-force
router.use('/confirm', rateLimit('cfm', 10));

const subscribeRoute = createRoute({
  method: 'post',
  path: '/subscribe',
  tags: ['Subscribers'],
  request: {
    body: {
      content: { 'application/json': { schema: z.object({ email: z.string().email(), language: z.enum(['de', 'en']).optional() }) } },
      required: true,
    },
  },
  responses: {
    201: { content: { 'application/json': { schema: OkSchema } }, description: 'Confirmation email sent' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Invalid email' },
    409: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Already subscribed' },
  },
});

const confirmRoute = createRoute({
  method: 'get',
  path: '/confirm',
  tags: ['Subscribers'],
  request: { query: z.object({ token: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ status: z.enum(['confirmed', 'already']) }) } },
      description: 'Confirmed successfully',
    },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Missing token' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Invalid or expired token' },
  },
});

const unsubscribeRoute = createRoute({
  method: 'get',
  path: '/unsubscribe',
  tags: ['Subscribers'],
  request: { query: z.object({ token: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: OkSchema } }, description: 'Unsubscribed successfully' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Missing token' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Invalid token' },
  },
});

router.openapi(subscribeRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { email, language } = c.req.valid('json');

  if (!email.includes('@')) return c.json({ error: 'Invalid email' }, 400);

  let token: string;
  try {
    token = crypto.randomUUID();
    await createSubscriber(db, email.toLowerCase().trim(), token, language ?? 'de');
  } catch {
    return c.json({ error: 'Already subscribed' }, 409);
  }

  const locale = (language ?? 'de') as 'de' | 'en';
  const apiBase = new URL(c.req.url).origin;
  const unsubscribeUrl = `${apiBase}/api/v1/unsubscribe?token=${token}`;
  const confirmUrl = `${WEB_ORIGIN}/${locale}/confirm?token=${token}`;

  c.executionCtx.waitUntil(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: email.toLowerCase().trim(),
        subject: locale === 'de' ? 'Anmeldung bei sdarm.life bestätigen' : 'Confirm your subscription to sdarm.life',
        html: confirmEmail({ confirmUrl, unsubscribeUrl, locale }),
      }),
    }),
  );

  return c.json({ ok: true as const }, 201);
});

router.openapi(confirmRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { token } = c.req.valid('query');

  const result = await confirmSubscriber(db, token);
  if (result.status === 'invalid') return c.json({ error: 'Invalid or expired token' }, 404);

  if (result.status === 'confirmed') {
    // Send welcome email only on first confirmation
    const locale = (result.sub.language ?? 'de') as 'de' | 'en';
    const apiBase = new URL(c.req.url).origin;
    const unsubscribeUrl = `${apiBase}/api/v1/unsubscribe?token=${result.sub.token}`;

    c.executionCtx.waitUntil(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: result.sub.email,
          subject: locale === 'de' ? 'Willkommen bei sdarm.life' : 'Welcome to sdarm.life',
          html: welcomeEmail({ unsubscribeUrl, locale }),
        }),
      }),
    );
  }

  return c.json({ status: result.status }, 200);
});

router.openapi(unsubscribeRoute, async (c) => {
  const db = drizzle(c.env.DB);
  const { token } = c.req.valid('query');

  const sub = await unsubscribeByToken(db, token);
  if (!sub) return c.json({ error: 'Invalid token' }, 404);

  return c.json({ ok: true as const }, 200);
});

export default router;
