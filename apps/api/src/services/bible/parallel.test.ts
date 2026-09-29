import { describe, expect, it } from 'vitest';
import { mergeParallelVerses, parseParallelCodes, projectorRefusals } from './parallel';

describe('parseParallelCodes', () => {
	it('reads t= in order, primary first', () => {
		expect(parseParallelCodes({ t: 'synodal, schlachter1905,kjv' })).toEqual({
			ok: true,
			codes: ['synodal', 'schlachter1905', 'kjv'],
			legacy: false,
		});
	});

	it('still reads the legacy a/b pair and marks it', () => {
		expect(parseParallelCodes({ a: 'delut', b: 'kjv' })).toEqual({ ok: true, codes: ['delut', 'kjv'], legacy: true });
	});

	it('refuses fewer than two, more than four, and repeats', () => {
		expect(parseParallelCodes({ t: 'kjv' }).ok).toBe(false);
		expect(parseParallelCodes({ t: 'a,b,c,d,e' }).ok).toBe(false);
		expect(parseParallelCodes({ t: 'kjv,kjv' }).ok).toBe(false);
		expect(parseParallelCodes({ a: 'kjv' }).ok).toBe(false);
		expect(parseParallelCodes({ a: 'kjv', b: 'kjv' }).ok).toBe(false);
		expect(parseParallelCodes({}).ok).toBe(false);
	});

	it('prefers t over a/b when both are sent', () => {
		const r = parseParallelCodes({ t: 'a,b,c', a: 'x', b: 'y' });
		expect(r.ok && r.codes).toEqual(['a', 'b', 'c']);
	});
});

describe('mergeParallelVerses', () => {
	it('aligns by verse number and leaves a missing verse null on its own side', () => {
		const merged = mergeParallelVerses([
			[
				{ verse: 1, text: 'a1' },
				{ verse: 2, text: 'a2' },
			],
			[{ verse: 2, text: 'b2' }],
			[
				{ verse: 1, text: 'c1' },
				{ verse: 3, text: 'c3' },
			],
		]);
		expect(merged).toEqual([
			{ verse: 1, texts: ['a1', null, 'c1'] },
			{ verse: 2, texts: ['a2', 'b2', null] },
			{ verse: 3, texts: [null, null, 'c3'] },
		]);
	});
});

describe('projectorRefusals', () => {
	it('names every translation that may not go on a shared screen', () => {
		const t = (name: string, allowProjector: boolean) => ({ name, license: { allowProjector } });
		expect(projectorRefusals([t('KJV', true), t('X', false), t('Y', false)])).toEqual(['X', 'Y']);
		expect(projectorRefusals([t('KJV', true)])).toEqual([]);
	});
});
