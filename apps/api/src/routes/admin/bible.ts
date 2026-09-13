import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Bindings } from '../../types';
import {
	BibleAdminTranslationSchema,
	BibleCatalogEntrySchema,
	BibleLicenseBasisSchema,
	BibleLicenseSchema,
	ErrorSchema,
	OkSchema,
	listOf,
} from '../../schemas';
import { BIBLE_TTL, bumpCacheGeneration, kvKey, withCache } from '../../services/bible/cache';
import * as catalog from '../../services/bible/catalog';
import * as local from '../../services/bible/local';
import * as repo from '../../repositories/bible';
import { purgeCache } from '../../middleware/cache';
import * as yv from '../../services/bible/youversion';

/**
 * Admin-only browse of the YouVersion catalog, used by Admin → Bible to pick
 * which translations to enable, plus CRUD over `bible_translations` in
 * `sdarm-bible` (license records + gates, for both sources) and the KV
 * allowlist that decides what the public routes serve.
 */
const router = new OpenAPIHono<{ Bindings: Bindings }>();

const BIBLE_DB_UNCONFIGURED = { error: 'Local Bible database is not configured on this environment.' } as const;

function toAdminDto(r: local.TranslationRecord, enabledIds: Set<string>) {
	return {
		id: r.id,
		source: r.source,
		code: r.slug,
		name: r.name,
		abbreviation: r.abbreviation,
		language: r.language,
		year: r.year,
		lxxPsalms: r.lxxPsalms,
		license: local.licenseOf(r),
		enabled: enabledIds.has(r.id),
		sortOrder: r.sortOrder,
		permissionRef: r.permissionRef ?? null,
		permissionDate: r.permissionDate ? r.permissionDate.toISOString() : null,
		status: {
			verseCount: r.verseCount,
			bookCount: r.bookCount,
			ingestedAt: r.ingestedAt ? r.ingestedAt.toISOString() : null,
			hasBundle: r.bundleKey !== null,
		},
	};
}

router.openapi(
	createRoute({
		method: 'get',
		path: '/catalog',
		tags: ['Admin / Bible'],
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				language: z.string().optional().openapi({ description: '3-letter language code (deu, eng, rus) or "all"', example: 'deu' }),
				pageToken: z.string().optional().openapi({ description: 'Opaque token from a previous response' }),
				allAvailable: z.enum(['true', 'false']).optional().openapi({
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
			const crawled = await withCache(c.env, kvKey.licensedIds(lang), BIBLE_TTL.catalog, () => yv.listLicensedIds(c.env, lang));
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

/**
 * Every configured translation, both sources — the operator's working list in
 * Admin → Bible. `enabled` is derived from the KV allowlist, not stored on the
 * row itself, so it can never drift from what the public routes actually serve.
 */
router.openapi(
	createRoute({
		method: 'get',
		path: '/translations',
		tags: ['Admin / Bible'],
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				content: { 'application/json': { schema: listOf(BibleAdminTranslationSchema) } },
				description: 'Every configured translation, both sources, with license, gates and ingest status',
			},
		},
	}),
	async (c) => {
		const [records, enabledIds] = await Promise.all([local.listAllRecords(c.env), catalog.getEnabledIds(c.env)]);
		const enabled = new Set(enabledIds);
		const items = records.map((r) => toAdminDto(r, enabled));
		return c.json({ items, total: items.length }, 200);
	},
);

/**
 * Create the D1 record for a YouVersion translation that has none yet — the
 * only way its license/gates become editable. Local translations get their
 * record from the ingest script (`scripts/bible/`), not from here.
 */
router.openapi(
	createRoute({
		method: 'post',
		path: '/translations',
		tags: ['Admin / Bible'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							id: z
								.string()
								.regex(/^yv:\d+$/, 'Must be a yv:-prefixed YouVersion id')
								.openapi({ example: 'yv:52' }),
							slug: z.string().min(1),
							name: z.string().min(1),
							abbreviation: z.string().min(1),
							language: z.string().min(1),
							year: z.number().int().optional(),
							lxxPsalms: z.boolean().optional(),
						}),
					},
				},
				required: true,
			},
		},
		responses: {
			201: { content: { 'application/json': { schema: BibleAdminTranslationSchema } }, description: 'Created' },
			409: { content: { 'application/json': { schema: ErrorSchema } }, description: 'A record for this id already exists' },
			503: { content: { 'application/json': { schema: ErrorSchema } }, description: BIBLE_DB_UNCONFIGURED.error },
		},
	}),
	async (c) => {
		const db = local.bibleDb(c.env);
		if (!db) return c.json(BIBLE_DB_UNCONFIGURED, 503);

		const body = c.req.valid('json');
		const existing = await repo.getTranslationRecord(db, body.id);
		if (existing) return c.json({ error: 'A record for this id already exists.' }, 409);

		// Restrictive defaults for provider-sourced text: no download, no offline
		// copy, no search index. The DB column defaults supply allowProjector=true
		// and the rest of the license record; an operator fills in rights holder
		// and notice afterwards via PATCH.
		const record = await repo.createTranslationRecord(db, {
			id: body.id,
			source: 'youversion',
			slug: body.slug,
			name: body.name,
			abbreviation: body.abbreviation,
			language: body.language,
			year: body.year ?? 0,
			lxxPsalms: body.lxxPsalms ?? false,
			licenseBasis: 'provider',
			notice: null,
		});

		const enabledIds = await catalog.getEnabledIds(c.env);
		return c.json(toAdminDto(record, new Set(enabledIds)), 201);
	},
);

/**
 * Partial update of one translation's identity, license record, and gates.
 * `{id}` is the prefixed id, url-encoded (`loc%3Aluther1912`) — Hono decodes
 * the path segment before this handler sees it, so no special handling is
 * needed here.
 */
router.openapi(
	createRoute({
		method: 'patch',
		path: '/translations/{id}',
		tags: ['Admin / Bible'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({ id: z.string() }),
			body: {
				content: {
					'application/json': {
						schema: z.object({
							name: z.string().optional(),
							slug: z.string().optional(),
							abbreviation: z.string().optional(),
							language: z.string().optional(),
							year: z.number().int().optional(),
							lxxPsalms: z.boolean().optional(),
							sortOrder: z.number().int().optional(),
							licenseBasis: BibleLicenseBasisSchema.optional(),
							rightsHolder: z.string().nullable().optional(),
							notice: z.string().nullable().optional(),
							provenance: z.string().nullable().optional(),
							permissionRef: z.string().nullable().optional(),
							permissionDate: z.string().nullable().optional().openapi({ description: 'ISO date, or null to clear' }),
							allowDownload: z.boolean().optional(),
							allowOffline: z.boolean().optional(),
							allowSearchIndex: z.boolean().optional(),
							allowProjector: z.boolean().optional(),
							maxVersesPerRequest: z.number().int().nullable().optional(),
						}),
					},
				},
				required: true,
			},
		},
		responses: {
			200: { content: { 'application/json': { schema: BibleAdminTranslationSchema } }, description: 'Updated' },
			404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'No record for this id' },
			503: { content: { 'application/json': { schema: ErrorSchema } }, description: BIBLE_DB_UNCONFIGURED.error },
		},
	}),
	async (c) => {
		const db = local.bibleDb(c.env);
		if (!db) return c.json(BIBLE_DB_UNCONFIGURED, 503);

		const { id } = c.req.valid('param');
		const { permissionDate, ...rest } = c.req.valid('json');
		const data: repo.UpdateTranslationInput = { ...rest };
		if (permissionDate !== undefined) data.permissionDate = permissionDate ? new Date(permissionDate) : null;

		const record = await repo.updateTranslationRecord(db, id, data);
		if (!record) return c.json({ error: 'Not found' }, 404);

		// The license object is embedded in every chapter and parallel response,
		// so editing a notice or a gate changes all of them at once.
		await bumpCacheGeneration(c.env);

		const enabledIds = await catalog.getEnabledIds(c.env);
		return c.json(toAdminDto(record, new Set(enabledIds)), 200);
	},
);

/**
 * Replace the KV allowlist wholesale, in the given order. Stored the same way
 * `PUT /admin/config/bible_translations` always has — a JSON array under the
 * `config` KV key — so this is just a dedicated, validated entry point onto
 * the same field rather than a second store.
 */
router.openapi(
	createRoute({
		method: 'put',
		path: '/allowlist',
		tags: ['Admin / Bible'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: { 'application/json': { schema: z.object({ ids: z.array(z.string()) }) } },
				required: true,
			},
		},
		responses: {
			200: { content: { 'application/json': { schema: OkSchema } }, description: 'Allowlist replaced' },
			400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'An id does not parse' },
		},
	}),
	async (c) => {
		const { ids } = c.req.valid('json');
		const parsed = ids.map(catalog.parseTranslationId);
		if (parsed.some((id) => id === null)) {
			return c.json({ error: 'Invalid translation id in list.' }, 400);
		}
		const deduped = [...new Set(parsed as string[])];

		const config = (await c.env.KV.get<Record<string, string | null>>('config', 'json')) ?? {};
		config.bible_translations = JSON.stringify(deduped);
		await c.env.KV.put('config', JSON.stringify(config));

		await bumpCacheGeneration(c.env);

		return c.json({ ok: true as const }, 200);
	},
);

/**
 * "Remove now": drop a translation from the allowlist and purge what of it we
 * can enumerate at the edge.
 *
 * Chapter and parallel URLs cannot be purged by URL — there are ~1,189 chapters
 * per translation plus every parallel pairing, and enumerating them would burn
 * meaningful request quota (see docs/gotchas.md on Bible crawl cost). They are
 * dropped by bumping the cache generation instead, which strands every stored
 * Bible response at once; the books index is enumerable, so that one is purged
 * outright.
 *
 * **The bound is about a minute, not instant.** Each isolate memoises the
 * generation for 60 s (see services/bible/cache.ts), so an isolate that read
 * the old token keeps serving the old entries until its memo expires. That is
 * the figure to quote a rights holder — and the figure to re-check before
 * signing anything that promises faster.
 *
 * What this still cannot reach: `apps/treasures`' own Next.js Data Cache, a
 * separate cache in a different Worker that this one has no handle on, and any
 * copy a reader has already downloaded.
 */
router.openapi(
	createRoute({
		method: 'post',
		path: '/takedown',
		tags: ['Admin / Bible'],
		security: [{ bearerAuth: [] }],
		request: {
			body: { content: { 'application/json': { schema: z.object({ id: z.string() }) } }, required: true },
		},
		responses: {
			200: { content: { 'application/json': { schema: OkSchema } }, description: 'Removed from the allowlist and purged' },
		},
	}),
	async (c) => {
		const { id } = c.req.valid('json');

		// Resolve the code before touching the allowlist — once removed,
		// resolveTranslation can no longer find it.
		const translations = await catalog.listTranslations(c.env);
		const code = translations.find((t) => t.id === id)?.code;

		const config = (await c.env.KV.get<Record<string, string | null>>('config', 'json')) ?? {};
		const raw: unknown = config.bible_translations ? JSON.parse(config.bible_translations) : [];
		const current = Array.isArray(raw) ? raw.map(catalog.parseTranslationId).filter((x): x is string => x !== null) : [];
		config.bible_translations = JSON.stringify(current.filter((existing) => existing !== id));
		await c.env.KV.put('config', JSON.stringify(config));

		// Strands every cached chapter and parallel response for every translation
		// — the only mechanism that reaches URLs we cannot enumerate.
		await bumpCacheGeneration(c.env);

		// The translation endpoints are uncached, but the books index is not, and
		// it is enumerable, so purge it outright rather than leaving it to expire.
		if (code) {
			const origin = new URL(c.req.url).origin;
			purgeCache(c.executionCtx, origin, [`/api/v1/bible/translations/${code}/books`], c.env);
		}

		return c.json({ ok: true as const }, 200);
	},
);

export default router;
