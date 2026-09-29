/**
 * Subscriber digest (issue #184) — turns "what changed in the window" into a
 * render-ready model. Pure: no bindings, no I/O, so the grouping, the caps and
 * the language choice are unit-tested without a database (test/digest.spec.ts).
 *
 * The caps are the anti-spam half of the design. A digest is one email per run
 * whatever happened in the window, and each list inside it is cut to a few
 * items with an "and N more" line — a 700-song import reads as one songbook
 * with five titles and "and 695 more", not as 700 lines or 700 emails.
 */
import de from '@sdarm/i18n/messages/de';
import en from '@sdarm/i18n/messages/en';
import { UNSUBSCRIBE_TOKEN } from '../../emails/layout';

export type DigestLocale = 'de' | 'en';

export const DIGEST_LIMITS = {
	posts: 5,
	songbooks: 4,
	songsPerSongbook: 5,
	treasures: 5,
	updatedTreasures: 3,
} as const;

/** Public hosts the email links to. Production hosts on purpose: the cron has no request to take an origin from. */
export const DIGEST_ORIGINS = {
	web: 'https://sdarm.life',
	songs: 'https://songs.sdarm.life',
	treasures: 'https://treasures.sdarm.life',
} as const;

// ── Input: what the repositories found in the window ──────────────────────────

export interface DigestContent {
	since: Date;
	until: Date;
	posts: { items: { title: string; slug: string; excerpt: string | null; publishedAt: Date | null }[]; total: number };
	songs: {
		/** Songbooks with at least one new song; `total` is the full count for that book. */
		songbooks: { id: number; title: string; slug: string; language: string; createdAt: Date; total: number }[];
		/** Possibly truncated per songbook; grouped and capped again here. */
		songs: { id: number; number: number; title: string; songbookId: number }[];
	};
	treasures: {
		added: { items: DigestTreasure[]; total: number };
		updated: { items: DigestTreasure[]; total: number };
	};
}

interface DigestTreasure {
	id: number;
	title: string;
	author: string | null;
	language: string;
}

// ── Output: the model the HTML and plain-text renderers consume ────────────────

export interface DigestLink {
	label: string;
	href: string;
}

export interface DigestItem {
	title: string;
	href: string;
	meta?: string;
	excerpt?: string;
}

export interface DigestGroup {
	title?: string;
	href?: string;
	badge?: string;
	meta?: string;
	items: DigestItem[];
	more?: string;
	link?: DigestLink;
}

export interface DigestSection {
	key: 'posts' | 'songs' | 'treasures';
	label: string;
	groups: DigestGroup[];
	more?: string;
	cta: DigestLink;
}

export interface DigestModel {
	locale: DigestLocale;
	subject: string;
	preheader: string;
	eyebrow: string;
	heading: string;
	intro: string;
	summary: string;
	sections: DigestSection[];
	/** Link text under each post. */
	readMore: string;
	footer: {
		reason: string;
		unsubscribe: string;
		/** Contains the placeholder token — see `UNSUBSCRIBE_TOKEN`. */
		unsubscribeHref: string;
		legal: DigestLink[];
		organisation: string;
		address: string;
	};
	home: string;
}

/**
 * Rendered once per language with this in place of the subscriber token, then
 * substituted per recipient — one render per language instead of one per
 * subscriber keeps the cron's CPU time flat as the list grows. Defined with the
 * shared email layout, which every per-recipient email uses.
 */
export { UNSUBSCRIBE_TOKEN };

/** Subscriber `language` → digest language. Anything but English gets German, the site default. */
export function digestLocale(language: string | null | undefined): DigestLocale {
	return language === 'en' ? 'en' : 'de';
}

/**
 * Whether this window is worth an email. New posts, songs and books count;
 * edited books do not on their own — an edit bumps `updated_at` whatever it
 * touched, and a typo fix must not mail every subscriber. Edits ride along in
 * a digest that is going out anyway.
 */
export function hasDigestContent(c: DigestContent): boolean {
	const songs = c.songs.songbooks.reduce((n, b) => n + b.total, 0);
	return c.posts.total + songs + c.treasures.added.total > 0;
}

const t = {
	de: {
		eyebrow: 'Neu auf sdarm.life',
		heading: 'Was es *Neues* gibt',
		intro:
			'Seit unserer letzten Nachricht sind neue Inhalte erschienen. Hier ist eine kurze Übersicht — jeder Link führt direkt zur jeweiligen Seite.',
		subject: (parts: string) => `Neu auf sdarm.life: ${parts}`,
		and: 'und',
		post: ['Beitrag', 'Beiträge'],
		song: ['Lied', 'Lieder'],
		book: ['Buch', 'Bücher'],
		revisedBook: ['überarbeitetes Buch', 'überarbeitete Bücher'],
		posts: 'Beiträge',
		readMore: 'Weiterlesen',
		allPosts: 'Alle Beiträge',
		morePosts: (n: string) => `und ${n} weitere Beiträge`,
		songs: 'Lieder',
		newSongs: (n: string) => (n === '1' ? '1 neues Lied' : `${n} neue Lieder`),
		newSongbook: 'Neues Liederbuch',
		number: 'Nr.',
		openSongbook: 'Liederbuch öffnen',
		moreSongs: (n: string) => `und ${n} weitere`,
		moreSongbooks: (books: string, songs: string) => `und ${books} weitere Liederbücher mit ${songs} neuen Liedern`,
		allSongs: 'Zu den Liederbüchern',
		treasures: 'Schätze',
		addedBooks: 'Neu in der Bibliothek',
		updatedBooks: 'Überarbeitet',
		moreBooks: (n: string) => `und ${n} weitere`,
		library: 'Zur Bibliothek',
		reason:
			'Sie erhalten diese E-Mail, weil Sie den Newsletter von sdarm.life abonniert und Ihre Anmeldung bestätigt haben. Wir schreiben nur, wenn es Neues gibt.',
		unsubscribe: 'Mit einem Klick abmelden',
		messages: de,
	},
	en: {
		eyebrow: 'New on sdarm.life',
		heading: "What's *new*",
		intro:
			'New content has appeared since our last message. Here is a short overview — each link takes you straight to the page.',
		subject: (parts: string) => `New on sdarm.life: ${parts}`,
		and: 'and',
		post: ['post', 'posts'],
		song: ['song', 'songs'],
		book: ['book', 'books'],
		revisedBook: ['revised book', 'revised books'],
		posts: 'Posts',
		readMore: 'Read more',
		allPosts: 'All posts',
		morePosts: (n: string) => `and ${n} more posts`,
		songs: 'Songs',
		newSongs: (n: string) => (n === '1' ? '1 new song' : `${n} new songs`),
		newSongbook: 'New songbook',
		number: 'No.',
		openSongbook: 'Open songbook',
		moreSongs: (n: string) => `and ${n} more`,
		moreSongbooks: (books: string, songs: string) => `and ${books} more songbooks with ${songs} new songs`,
		allSongs: 'Browse songbooks',
		treasures: 'Treasures',
		addedBooks: 'New in the library',
		updatedBooks: 'Revised',
		moreBooks: (n: string) => `and ${n} more`,
		library: 'Visit the library',
		reason:
			'You are receiving this email because you subscribed to the sdarm.life newsletter and confirmed your subscription. We only write when there is something new.',
		unsubscribe: 'Unsubscribe with one click',
		messages: en,
	},
} as const;

const EXCERPT_MAX = 180;

function excerpt(s: string | null): string | undefined {
	const text = s?.replace(/\s+/g, ' ').trim();
	if (!text) return undefined;
	if (text.length <= EXCERPT_MAX) return text;
	const cut = text.slice(0, EXCERPT_MAX);
	return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : EXCERPT_MAX)}…`;
}

function joinList(parts: string[], and: string): string {
	if (parts.length <= 1) return parts.join('');
	return `${parts.slice(0, -1).join(', ')} ${and} ${parts[parts.length - 1]}`;
}

export function buildDigest(c: DigestContent, locale: DigestLocale): DigestModel {
	const s = t[locale];
	const num = new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB');
	const n = (v: number) => num.format(v);
	const plural = (v: number, forms: readonly [string, string]) => `${n(v)} ${v === 1 ? forms[0] : forms[1]}`;
	const web = `${DIGEST_ORIGINS.web}/${locale}`;
	const songsHome = `${DIGEST_ORIGINS.songs}/${locale}`;
	const library = `${DIGEST_ORIGINS.treasures}/${locale}`;

	const sections: DigestSection[] = [];

	// ── Posts ──
	if (c.posts.total > 0) {
		const shown = c.posts.items.slice(0, DIGEST_LIMITS.posts);
		sections.push({
			key: 'posts',
			label: s.posts,
			groups: [
				{
					items: shown.map((p) => ({
						title: p.title,
						href: `${web}/posts/${encodeURIComponent(p.slug)}`,
						excerpt: excerpt(p.excerpt),
					})),
				},
			],
			more: c.posts.total > shown.length ? s.morePosts(n(c.posts.total - shown.length)) : undefined,
			cta: { label: s.allPosts, href: web },
		});
	}

	// ── Songs, grouped by songbook ──
	const songTotal = c.songs.songbooks.reduce((acc, b) => acc + b.total, 0);
	if (songTotal > 0) {
		const bySongbook = new Map<number, DigestContent['songs']['songs']>();
		for (const song of c.songs.songs) {
			const list = bySongbook.get(song.songbookId) ?? [];
			list.push(song);
			bySongbook.set(song.songbookId, list);
		}
		const books = c.songs.songbooks.filter((b) => b.total > 0);
		const shownBooks = books.slice(0, DIGEST_LIMITS.songbooks);
		const hiddenBooks = books.slice(DIGEST_LIMITS.songbooks);
		const groups = shownBooks.map<DigestGroup>((b) => {
			const bookHref = `${songsHome}/songbooks/${encodeURIComponent(b.slug)}`;
			const songs = (bySongbook.get(b.id) ?? [])
				.slice()
				.sort((x, y) => x.number - y.number || x.id - y.id)
				.slice(0, DIGEST_LIMITS.songsPerSongbook);
			return {
				title: b.title,
				href: bookHref,
				badge: b.createdAt > c.since ? s.newSongbook : undefined,
				meta: s.newSongs(n(b.total)),
				items: songs.map((song) => ({
					title: song.title,
					href: `${bookHref}/${song.id}`,
					meta: `${s.number} ${song.number}`,
				})),
				more: b.total > songs.length ? s.moreSongs(n(b.total - songs.length)) : undefined,
				link: { label: s.openSongbook, href: bookHref },
			};
		});
		sections.push({
			key: 'songs',
			label: s.songs,
			groups,
			more:
				hiddenBooks.length > 0
					? s.moreSongbooks(n(hiddenBooks.length), n(hiddenBooks.reduce((acc, b) => acc + b.total, 0)))
					: undefined,
			cta: { label: s.allSongs, href: `${songsHome}/songbooks` },
		});
	}

	// ── Treasures: new first, edits as a quieter second list ──
	const { added, updated } = c.treasures;
	if (added.total + updated.total > 0) {
		const bookItem = (b: DigestTreasure): DigestItem => ({
			title: b.title,
			href: `${library}/books/${b.id}`,
			meta: [b.author, b.language.toUpperCase()].filter(Boolean).join(' · '),
		});
		const groups: DigestGroup[] = [];
		const addedShown = added.items.slice(0, DIGEST_LIMITS.treasures);
		if (added.total > 0) {
			groups.push({
				title: s.addedBooks,
				items: addedShown.map(bookItem),
				more: added.total > addedShown.length ? s.moreBooks(n(added.total - addedShown.length)) : undefined,
			});
		}
		const updatedShown = updated.items.slice(0, DIGEST_LIMITS.updatedTreasures);
		if (updated.total > 0) {
			groups.push({
				title: s.updatedBooks,
				items: updatedShown.map(bookItem),
				more: updated.total > updatedShown.length ? s.moreBooks(n(updated.total - updatedShown.length)) : undefined,
			});
		}
		sections.push({ key: 'treasures', label: s.treasures, groups, cta: { label: s.library, href: library } });
	}

	const counts = [
		c.posts.total > 0 ? plural(c.posts.total, s.post) : null,
		songTotal > 0 ? plural(songTotal, s.song) : null,
		added.total > 0 ? plural(added.total, s.book) : null,
	].filter((x): x is string => x !== null);
	const summaryParts = updated.total > 0 ? [...counts, plural(updated.total, s.revisedBook)] : counts;

	const legal = s.messages.web.legal;
	const [organisation, ...addressLines] = legal.impressum.section1Body.split('\n');

	return {
		locale,
		subject: s.subject(joinList(counts.length > 0 ? counts : summaryParts, s.and)),
		preheader: summaryParts.join(' · '),
		eyebrow: `${s.eyebrow} · ${formatRange(c.since, c.until, locale)}`,
		heading: s.heading,
		intro: s.intro,
		summary: summaryParts.join(' · '),
		sections,
		readMore: s.readMore,
		footer: {
			reason: s.reason,
			unsubscribe: s.unsubscribe,
			unsubscribeHref: `${web}/unsubscribe?token=${UNSUBSCRIBE_TOKEN}`,
			legal: [
				{ label: legal.impressum.title, href: `${web}/impressum` },
				{ label: legal.datenschutz.title, href: `${web}/datenschutz` },
			],
			organisation,
			address: addressLines.join(', '),
		},
		home: web,
	};
}

function formatRange(since: Date, until: Date, locale: DigestLocale): string {
	const fmt = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Berlin',
	});
	return fmt.formatRange(since, until);
}
