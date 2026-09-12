import { describe, expect, it } from 'vitest';
import { parseTranslationId } from './catalog';

// Pure logic, no D1/KV — safe to test directly (see docs/testing.md on why
// apps/api tests must not touch D1-backed routes).
describe('parseTranslationId', () => {
	it('reads a bare number as a yv: id', () => {
		expect(parseTranslationId(51)).toBe('yv:51');
		expect(parseTranslationId('51')).toBe('yv:51');
	});

	it('passes through a well-formed prefixed id', () => {
		expect(parseTranslationId('loc:kjv')).toBe('loc:kjv');
		expect(parseTranslationId('yv:51')).toBe('yv:51');
		expect(parseTranslationId('loc:luther1912')).toBe('loc:luther1912');
	});

	it('rejects junk', () => {
		expect(parseTranslationId('')).toBeNull();
		expect(parseTranslationId('kjv')).toBeNull(); // unprefixed slug — ambiguous
		expect(parseTranslationId('loc:')).toBeNull();
		expect(parseTranslationId('yv:abc')).toBeNull();
		expect(parseTranslationId('0')).toBeNull();
		expect(parseTranslationId('-1')).toBeNull();
		expect(parseTranslationId(null)).toBeNull();
		expect(parseTranslationId(undefined)).toBeNull();
		expect(parseTranslationId({})).toBeNull();
	});
});
