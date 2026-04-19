import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../types';

const router = new OpenAPIHono<{ Bindings: Bindings }>();

const NominatimResultSchema = z
  .object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    address: z
      .object({
        city: z.string().optional(),
        town: z.string().optional(),
        village: z.string().optional(),
        municipality: z.string().optional(),
        county: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        postcode: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const geocodeRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Geocode'],
  request: {
    query: z.object({
      q: z.string().min(1).max(100),
      limit: z.coerce.number().int().min(1).max(10).optional(),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(NominatimResultSchema).openapi('GeocodeResults') } },
      description: 'Geocoding results from Nominatim (proxied + cached)',
    },
    400: { description: 'Invalid query' },
  },
});

router.openapi(geocodeRoute, async (c) => {
  const { q, limit = 3 } = c.req.valid('query');
  const cacheKey = `geocode:${q.trim().toLowerCase()}:${limit}`;

  const cached = await c.env.KV.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=${limit}&addressdetails=1`;
  const upstream = await fetch(url, {
    headers: { 'User-Agent': 'sdarm.life-geocoder (info@sdarm.life)' },
  });

  if (!upstream.ok) {
    return c.json([], 200);
  }

  const body = await upstream.text();
  c.executionCtx.waitUntil(c.env.KV.put(cacheKey, body, { expirationTtl: 60 * 60 * 24 * 30 }));

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
});

export default router;
