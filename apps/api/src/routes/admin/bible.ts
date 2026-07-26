import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../../types';
import { BibleCatalogEntrySchema, BibleLicenseSchema, ErrorSchema, listOf } from '../../schemas';
import { BIBLE_TTL, kvKey, withCache } from '../../services/bible/cache';
import * as yv from '../../services/bible/youversion';

/**
 * Admin-only browse of the YouVersion catalog, used by Admin → Bible to pick
 * which translations to enable. The chosen IDs are saved through the ordinary
 * `PUT /admin/config/bible_translations` route — there is no separate store.
 */
const router = new OpenAPIHono<{ Bindings: Bindings }>();

router.openapi(
  createRoute({
    method: 'get',
    path: '/catalog',
    tags: ['Admin / Bible'],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        language: z
          .string()
          .optional()
          .openapi({ description: '3-letter language code (deu, eng, rus) or "all"', example: 'deu' }),
        pageToken: z.string().optional().openapi({ description: 'Opaque token from a previous response' }),
        allAvailable: z
          .enum(['true', 'false'])
          .optional()
          .openapi({
            description:
              'Include Bibles our app key has no license for. They are returned with licensed=false and cannot be read until the covering license is accepted.',
          }),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: listOf(BibleCatalogEntrySchema).extend({ nextPageToken: z.string().nullable() }),
          },
        },
        description: 'One page of the YouVersion catalog',
      },
      503: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'YOUVERSION_API_KEY not configured, or YouVersion unreachable',
      },
    },
  }),
  async (c) => {
    const { language, pageToken, allAvailable } = c.req.valid('query');
    if (!yv.isConfigured(c.env)) {
      return c.json({ error: 'YouVersion API key is not configured on the API worker.' }, 503);
    }

    const lang = language && language !== 'all' ? language : '*';
    const all = allAvailable === 'true';

    // Which Bibles our key may read. Cached per language rather than per page,
    // so the multi-request crawl runs once a day instead of on every pager click.
    //
    // An all_available listing is only meaningful alongside this set: without it
    // every row would be labelled licensed, including the ones that cannot be
    // read — and that page would then be cached for a day. Failing the request
    // is the honest outcome; the operator retries.
    let licensedIds: number[] | undefined;
    if (all) {
      const crawled = await withCache(c.env, kvKey.licensedIds(lang), BIBLE_TTL.catalog, () =>
        yv.listLicensedIds(c.env, lang),
      );
      if (!crawled) return c.json({ error: 'Could not determine which Bibles are licensed. Please retry.' }, 503);
      licensedIds = crawled;
    }

    // The two listings differ in content, so they must not share a cache entry.
    const cacheKey = `${kvKey.catalog(lang, pageToken ?? '')}${all ? ':all' : ''}`;
    const page = await withCache(c.env, cacheKey, BIBLE_TTL.catalog, () =>
      yv.listCatalog(c.env, { language: lang, pageToken, allAvailable: all, licensedIds }),
    );
    if (!page) return c.json({ error: 'YouVersion is currently unreachable.' }, 503);

    return c.json({ items: page.items, total: page.total, nextPageToken: page.nextPageToken }, 200);
  },
);

/**
 * Licenses available to the app key, so an operator can see which publisher's
 * terms govern a translation and what else the same license covers.
 *
 * Acceptance state is not exposed — YouVersion does not report it to an app key
 * (see `listLicenses`). Readability comes from the catalog's `licensed` flag.
 */
router.openapi(
  createRoute({
    method: 'get',
    path: '/licenses',
    tags: ['Admin / Bible'],
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        bibleId: z
          .string()
          .regex(/^\d+$/)
          .optional()
          .openapi({ description: 'Return only the license governing this Bible ID', example: '1' }),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: listOf(BibleLicenseSchema) } },
        description: 'Licenses available to the app key, each with the Bible IDs it governs',
      },
      503: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'YOUVERSION_API_KEY not configured, or YouVersion unreachable',
      },
    },
  }),
  async (c) => {
    const { bibleId } = c.req.valid('query');
    if (!yv.isConfigured(c.env)) {
      return c.json({ error: 'YouVersion API key is not configured on the API worker.' }, 503);
    }

    const id = bibleId ? Number(bibleId) : undefined;
    const licenses = await withCache(c.env, kvKey.licenses(id ?? 0), BIBLE_TTL.catalog, () => yv.listLicenses(c.env, id));
    if (!licenses) return c.json({ error: 'YouVersion is currently unreachable.' }, 503);

    return c.json({ items: licenses, total: licenses.length }, 200);
  },
);

export default router;
