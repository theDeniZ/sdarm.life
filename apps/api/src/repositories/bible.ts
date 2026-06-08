import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { bibleBooks, bibleTranslations, bibleVerses, treasures } from '@sdarm/db';
import { resolveParallelPsalmChapters } from '@sdarm/types';

const translationSelect = {
	id: bibleTranslations.id,
	code: bibleTranslations.code,
	year: bibleTranslations.year,
	copyright: bibleTranslations.copyright,
	license: bibleTranslations.license,
	treasureId: treasures.id,
	name: treasures.title,
	language: treasures.language,
	description: treasures.description,
	coverGradient: treasures.coverGradient,
	coverAccentColor: treasures.coverAccentColor,
	coverKey: treasures.coverKey,
	sortOrder: treasures.sortOrder,
};

function translationRow(r: {
	id: number;
	code: string;
	year: number;
	copyright: string | null;
	license: string;
	treasureId: number;
	name: string;
	language: string;
	description: string | null;
	coverGradient: string | null;
	coverAccentColor: string | null;
	coverKey: string | null;
}) {
	return {
		id: r.id,
		code: r.code,
		name: r.name,
		language: r.language,
		year: r.year,
		copyright: r.copyright,
		license: r.license,
		treasureId: r.treasureId,
		description: r.description,
		coverGradient: r.coverGradient,
		coverAccentColor: r.coverAccentColor,
		coverKey: r.coverKey,
	};
}

export async function listTranslations(db: DrizzleD1Database) {
	const rows = await db
		.select(translationSelect)
		.from(bibleTranslations)
		.innerJoin(treasures, eq(treasures.id, bibleTranslations.treasureId))
		.orderBy(asc(treasures.sortOrder), asc(bibleTranslations.id));
	return { items: rows.map(translationRow), total: rows.length };
}

export async function getTranslationByCode(db: DrizzleD1Database, code: string) {
	const [row] = await db
		.select(translationSelect)
		.from(bibleTranslations)
		.innerJoin(treasures, eq(treasures.id, bibleTranslations.treasureId))
		.where(eq(bibleTranslations.code, code))
		.limit(1);
	return row ? translationRow(row) : null;
}

const bookSelect = {
	id: bibleBooks.id,
	code: bibleBooks.code,
	number: bibleBooks.number,
	name: bibleBooks.name,
	abbreviation: bibleBooks.abbreviation,
	testament: bibleBooks.testament,
	chapterCount: bibleBooks.chapterCount,
};

export async function listBooks(db: DrizzleD1Database, translationCode: string) {
	const rows = await db
		.select(bookSelect)
		.from(bibleBooks)
		.innerJoin(bibleTranslations, eq(bibleTranslations.id, bibleBooks.translationId))
		.where(eq(bibleTranslations.code, translationCode))
		.orderBy(asc(bibleBooks.number));
	return { items: rows, total: rows.length };
}

export async function getBook(db: DrizzleD1Database, translationCode: string, bookCode: string) {
	const [row] = await db
		.select(bookSelect)
		.from(bibleBooks)
		.innerJoin(bibleTranslations, eq(bibleTranslations.id, bibleBooks.translationId))
		.where(and(eq(bibleTranslations.code, translationCode), eq(bibleBooks.code, bookCode)))
		.limit(1);
	return row ?? null;
}

export async function getChapter(db: DrizzleD1Database, translationCode: string, bookCode: string, chapter: number) {
	// Fire book metadata + verses in parallel — verses query joins via codes
	// directly, so it doesn't need book.id from the metadata query.
	const [bookRows, verses] = await Promise.all([
		db
			.select({
				...bookSelect,
				translationName: treasures.title,
				translationCode: bibleTranslations.code,
			})
			.from(bibleBooks)
			.innerJoin(bibleTranslations, eq(bibleTranslations.id, bibleBooks.translationId))
			.innerJoin(treasures, eq(treasures.id, bibleTranslations.treasureId))
			.where(and(eq(bibleTranslations.code, translationCode), eq(bibleBooks.code, bookCode)))
			.limit(1),
		db
			.select({ verse: bibleVerses.verse, text: bibleVerses.text })
			.from(bibleVerses)
			.innerJoin(bibleBooks, eq(bibleBooks.id, bibleVerses.bookId))
			.innerJoin(bibleTranslations, eq(bibleTranslations.id, bibleBooks.translationId))
			.where(and(eq(bibleTranslations.code, translationCode), eq(bibleBooks.code, bookCode), eq(bibleVerses.chapter, chapter)))
			.orderBy(asc(bibleVerses.verse)),
	]);

	const [bookRow] = bookRows;
	if (!bookRow) return null;
	if (chapter < 1 || chapter > bookRow.chapterCount) return null;
	if (verses.length === 0) return null;

	const { translationName, translationCode: tCode, ...book } = bookRow;
	return {
		translation: { code: tCode, name: translationName },
		book,
		chapter,
		verses,
	};
}

export async function getParallelChapter(db: DrizzleD1Database, codeA: string, codeB: string, bookCode: string, chapter: number) {
	const { chapterA, chapterB } = resolveParallelPsalmChapters(codeA, codeB, bookCode, chapter);
	const [chA, chB] = await Promise.all([getChapter(db, codeA, bookCode, chapterA), getChapter(db, codeB, bookCode, chapterB)]);
	if (!chA || !chB) return null;

	const map = new Map<number, { verse: number; a: string | null; b: string | null }>();
	for (const v of chA.verses) map.set(v.verse, { verse: v.verse, a: v.text, b: null });
	for (const v of chB.verses) {
		const existing = map.get(v.verse);
		if (existing) existing.b = v.text;
		else map.set(v.verse, { verse: v.verse, a: null, b: v.text });
	}
	const verses = [...map.values()].sort((x, y) => x.verse - y.verse);

	return {
		bookCode,
		a: { code: chA.translation.code, name: chA.translation.name, chapter: chapterA },
		b: { code: chB.translation.code, name: chB.translation.name, chapter: chapterB },
		verses,
	};
}
