/**
 * Pure helpers behind `GET /bible/parallel` — no bindings, so they are unit
 * tested directly (`parallel.test.ts`).
 *
 * The route takes 2–4 translations. Two query forms reach it: `?t=a,b,c` (the
 * current one, order = screen order) and the original `?a=&b=`, which existing
 * links and older clients still send and which keeps its legacy `a`/`b` fields
 * in the response.
 */
import { PARALLEL_MAX_TRANSLATIONS, type ParallelVerseDto } from '@sdarm/types';

export type ParallelCodes = { ok: true; codes: string[]; legacy: boolean } | { ok: false; error: string };

export function parseParallelCodes(query: { t?: string; a?: string; b?: string }): ParallelCodes {
	const legacy = query.t === undefined;
	const raw = legacy ? [query.a, query.b] : query.t!.split(',');
	const codes = raw.map((c) => c?.trim() ?? '').filter((c) => c !== '');

	if (legacy && codes.length < 2) return { ok: false, error: 'Pass t=code1,code2[,…] or both a and b' };
	if (codes.length < 2 || codes.length > PARALLEL_MAX_TRANSLATIONS) {
		return { ok: false, error: `Pick between 2 and ${PARALLEL_MAX_TRANSLATIONS} translations` };
	}
	if (new Set(codes).size !== codes.length) return { ok: false, error: 'Pick different translations' };
	return { ok: true, codes, legacy };
}

/**
 * Align N chapters by verse number. A verse that one side lacks is null on
 * that side — never dropped, never shifted into a neighbour's row.
 */
export function mergeParallelVerses(sides: { verse: number; text: string }[][]): ParallelVerseDto[] {
	const merged = new Map<number, (string | null)[]>();
	sides.forEach((verses, i) => {
		for (const v of verses) {
			let row = merged.get(v.verse);
			if (!row) {
				row = sides.map(() => null);
				merged.set(v.verse, row);
			}
			row[i] = v.text;
		}
	});
	return [...merged.entries()].sort(([x], [y]) => x - y).map(([verse, texts]) => ({ verse, texts }));
}

/**
 * The translations whose license keeps their text off a shared screen. The
 * strictest side decides: one refusal refuses the whole parallel view.
 */
export function projectorRefusals<T extends { name: string; license: { allowProjector: boolean } }>(
	translations: T[],
): string[] {
	return translations.filter((t) => !t.license.allowProjector).map((t) => t.name);
}
