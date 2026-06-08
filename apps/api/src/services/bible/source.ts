import { drizzle } from 'drizzle-orm/d1';
import type { Bindings } from '../../types';
import * as repo from '../../repositories/bible';
import * as yv from './youversion';
import {
	BIBLE_KV_TTL,
	cacheGetJson,
	cachePutJson,
	kvKeyBook,
	kvKeyBookList,
	kvKeyChapter,
	kvKeyParallel,
	kvKeyTranslation,
	kvKeyTranslationList,
} from './cache';

export type Source = 'youversion' | 'd1' | 'kv';

// ─── Translations ─────────────────────────────────────────────────────────────

type TranslationListResult = { items: yv.TranslationRow[]; total: number };

/**
 * Languages we surface first in the catalog, in this order. Anything else
 * follows, alphabetised by language tag. Within a language, translations are
 * alphabetised by display name (so the 3 D1 baked-in versions still get a
 * predictable, readable position).
 */
const LANG_PRIORITY = ['ro', 'ru', 'uk', 'en', 'de'] as const;

function langRank(tag: string): number {
	const i = LANG_PRIORITY.indexOf(tag as (typeof LANG_PRIORITY)[number]);
	return i === -1 ? LANG_PRIORITY.length : i;
}

function sortTranslations(rows: yv.TranslationRow[]): yv.TranslationRow[] {
	return rows.slice().sort((a, b) => {
		const ra = langRank(a.language);
		const rb = langRank(b.language);
		if (ra !== rb) return ra - rb;
		if (a.language !== b.language) return a.language.localeCompare(b.language);
		return a.name.localeCompare(b.name);
	});
}

export async function listTranslations(env: Bindings): Promise<[TranslationListResult, Source]> {
	const key = kvKeyTranslationList();
	const cached = await cacheGetJson<TranslationListResult>(env, key);
	if (cached) return [cached, 'kv'];

	const db = drizzle(env.DB);
	const yvRows = await yv.listTranslations(env);
	const fallback = await repo.listTranslations(db);

	if (yvRows && yvRows.length > 0) {
		// Merge YV catalog with treasure-side metadata: where a YV translation
		// matches one of our baked-in codes, prefer the D1 row (it carries
		// cover/gradient/treasureId from the `treasures` table).
		const byCode = new Map<string, yv.TranslationRow>();
		for (const r of yvRows) byCode.set(r.code, r);
		for (const r of fallback.items) byCode.set(r.code, r);
		const merged: yv.TranslationRow[] = sortTranslations([...byCode.values()]);
		const result: TranslationListResult = { items: merged, total: merged.length };
		await cachePutJson(env, key, result, BIBLE_KV_TTL.translationList);
		return [result, 'youversion'];
	}

	// YV unavailable → D1 only. Cache for a shorter window so we re-try soon.
	const sortedFallback: TranslationListResult = {
		items: sortTranslations(fallback.items),
		total: fallback.total,
	};
	await cachePutJson(env, key, sortedFallback, BIBLE_KV_TTL.fallback);
	return [sortedFallback, 'd1'];
}

export async function getTranslationByCode(env: Bindings, code: string): Promise<[yv.TranslationRow | null, Source]> {
	const key = kvKeyTranslation(code);
	const cached = await cacheGetJson<yv.TranslationRow>(env, key);
	if (cached) return [cached, 'kv'];

	// Resolve from the merged list — that way we get treasure-metadata for the
	// 3 baked-in codes and YV-only metadata for everything else.
	const [list, source] = await listTranslations(env);
	const found = list.items.find((t) => t.code === code) ?? null;
	if (found) {
		const ttl = source === 'd1' ? BIBLE_KV_TTL.fallback : BIBLE_KV_TTL.translationList;
		await cachePutJson(env, key, found, ttl);
	}
	return [found, source];
}

// ─── Books ────────────────────────────────────────────────────────────────────

type BookListResult = { items: yv.BookRow[]; total: number };

export async function listBooks(env: Bindings, translationCode: string): Promise<[BookListResult, Source]> {
	const key = kvKeyBookList(translationCode);
	const cached = await cacheGetJson<BookListResult>(env, key);
	if (cached) return [cached, 'kv'];

	const yvBooks = await yv.listBooks(env, translationCode);
	if (yvBooks && yvBooks.length > 0) {
		const result: BookListResult = { items: yvBooks, total: yvBooks.length };
		await cachePutJson(env, key, result, BIBLE_KV_TTL.bookList);
		return [result, 'youversion'];
	}

	const db = drizzle(env.DB);
	const fallback = await repo.listBooks(db, translationCode);
	await cachePutJson(env, key, fallback, BIBLE_KV_TTL.fallback);
	return [fallback, 'd1'];
}

export async function getBook(env: Bindings, translationCode: string, bookCode: string): Promise<[yv.BookRow | null, Source]> {
	const key = kvKeyBook(translationCode, bookCode);
	const cached = await cacheGetJson<yv.BookRow>(env, key);
	if (cached) return [cached, 'kv'];

	const [list, source] = await listBooks(env, translationCode);
	const found = list.items.find((b) => b.code === bookCode) ?? null;
	if (found) {
		const ttl = source === 'd1' ? BIBLE_KV_TTL.fallback : BIBLE_KV_TTL.bookList;
		await cachePutJson(env, key, found, ttl);
	}
	return [found, source];
}

// ─── Chapter ──────────────────────────────────────────────────────────────────

export async function getChapter(env: Bindings, translationCode: string, bookCode: string, chapter: number): Promise<[yv.ChapterShape | null, Source]> {
	const key = kvKeyChapter(translationCode, bookCode, chapter);
	const cached = await cacheGetJson<yv.ChapterShape>(env, key);
	if (cached) return [cached, 'kv'];

	const yvChapter = await yv.getChapter(env, translationCode, bookCode, chapter);
	if (yvChapter) {
		await cachePutJson(env, key, yvChapter, BIBLE_KV_TTL.chapter);
		return [yvChapter, 'youversion'];
	}

	const db = drizzle(env.DB);
	const fallback = await repo.getChapter(db, translationCode, bookCode, chapter);
	if (fallback) await cachePutJson(env, key, fallback, BIBLE_KV_TTL.fallback);
	return [fallback, 'd1'];
}

// ─── Parallel ─────────────────────────────────────────────────────────────────

export async function getParallelChapter(
	env: Bindings,
	codeA: string,
	codeB: string,
	bookCode: string,
	chapter: number,
): Promise<[yv.ParallelShape | null, Source]> {
	const key = kvKeyParallel(codeA, codeB, bookCode, chapter);
	const cached = await cacheGetJson<yv.ParallelShape>(env, key);
	if (cached) return [cached, 'kv'];

	const yvParallel = await yv.getParallelChapter(env, codeA, codeB, bookCode, chapter);
	if (yvParallel) {
		await cachePutJson(env, key, yvParallel, BIBLE_KV_TTL.chapter);
		return [yvParallel, 'youversion'];
	}

	const db = drizzle(env.DB);
	const fallback = await repo.getParallelChapter(db, codeA, codeB, bookCode, chapter);
	if (fallback) await cachePutJson(env, key, fallback, BIBLE_KV_TTL.fallback);
	return [fallback, 'd1'];
}
