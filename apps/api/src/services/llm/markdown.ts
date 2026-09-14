/**
 * Pure Markdown-building helpers for the `/api/v1/llm/*` agent endpoints.
 *
 * No D1, no KV, no `env` — everything here takes plain data and returns a
 * string, which is what makes it unit-testable without the Workers pool (see
 * docs/testing.md). Route handlers in `routes/llm.ts` fetch data via the
 * existing repositories/services and hand it to these builders.
 */

const SITE_URL = 'https://sdarm.life';
const SONGBOOK_URL = 'https://songs.sdarm.life';
const TREASURES_URL = 'https://treasures.sdarm.life';
const SBL_URL = 'https://sbl.sdarm.life';

/** Strips chord annotations like `[G]`, `[Cm7]` embedded in song lyrics. */
export function stripChords(lyrics: string): string {
  return lyrics.replace(/\[[A-H][^\]]*\]/g, '');
}

/** Strips i18n rich-text markup (`<em>…</em>`, `<br></br>`, …), keeping the inner text. */
export function stripRichTags(s: string): string {
  return s.replace(/<\/?[a-z][a-z0-9]*\s*\/?>/gi, '').trim();
}

function md(c: string, status: number, headers: Record<string, string> = {}): { body: string; status: number; headers: Record<string, string> } {
  return { body: c, status, headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers } };
}

export function notFoundMarkdown(): ReturnType<typeof md> {
  return md('# Not found\n', 404);
}

export function forbiddenMarkdown(reason: string): ReturnType<typeof md> {
  return md(`# Not available\n\n${reason}\n`, 403);
}

// ── Index ─────────────────────────────────────────────────────────────────────

/** The `/api/v1/llm` and `/llms.txt` content — identical, no D1 read. */
export function buildIndexMarkdown(apiOrigin: string): ReturnType<typeof md> {
  const lines = [
    '# sdarm.life — AI agent index',
    '',
    'sdarm.life is the online presence of the Seventh Day Adventist Reform Movement ' +
      '(Siebenten-Tags-Adventisten Reformationsbewegung), serving congregations in Germany, ' +
      'Austria, and Switzerland. This index lists Markdown endpoints for AI agents to read our ' +
      'public content — church info, articles, hymnals, a book catalogue, and locally-hosted ' +
      'Bible translations — without crawling the full HTML site.',
    '',
    '## Endpoints',
    '',
    `- [Site info](${apiOrigin}/api/v1/llm/site) — about us, contact, 25 points of faith (\`?lang=de|en\`, default de)`,
    `- [Posts](${apiOrigin}/api/v1/llm/posts) — latest articles`,
    `- [Songbooks](${apiOrigin}/api/v1/llm/songbooks) — hymnal list, each with the whole book`,
    `- [Treasures](${apiOrigin}/api/v1/llm/treasures) — book catalogue`,
    `- [Bible](${apiOrigin}/api/v1/llm/bible) — locally-hosted, downloadable translations`,
    '',
    '## Sabbath Bible Lesson',
    '',
    'The Sabbath Bible Lesson quarterlies are a separate, static site and are not part of this ' +
      'API — fetch them directly as JSON:',
    '',
    `- Index: ${SBL_URL}/data/index.json (keys like \`de-2026-3\`)`,
    `- Quarter: ${SBL_URL}/data/{lang}/{key}.json`,
    '',
  ];
  return md(lines.join('\n'), 200);
}

// ── Site ──────────────────────────────────────────────────────────────────────

export interface GlaubensDetailBlock {
  text: string;
  refs?: string;
}

export interface GlaubensArticleInput {
  num: string;
  titlePrefix: string;
  accent: string;
  titleSuffix?: string;
  body: string;
  refs: string;
  detail?: GlaubensDetailBlock[];
}

export interface SiteMarkdownInput {
  lang: 'de' | 'en';
  aboutText1: string;
  aboutText2: string;
  articles: GlaubensArticleInput[];
  email: string;
  facebook: string | null;
  whatsapp: string | null;
  instagram: string | null;
  youtube: string | null;
}

export function buildSiteMarkdown(input: SiteMarkdownInput): ReturnType<typeof md> {
  const isEn = input.lang === 'en';
  const lines = [`# sdarm.life — ${isEn ? 'About us' : 'Über uns'}`, ''];
  lines.push(stripRichTags(input.aboutText1), '');
  lines.push(stripRichTags(input.aboutText2), '');

  lines.push('## Contact', '');
  lines.push(`- Email: ${input.email}`);
  if (input.facebook) lines.push(`- Facebook: ${input.facebook}`);
  if (input.whatsapp) lines.push(`- WhatsApp: ${input.whatsapp}`);
  if (input.instagram) lines.push(`- Instagram: ${input.instagram}`);
  if (input.youtube) lines.push(`- YouTube: ${input.youtube}`);
  lines.push('');

  lines.push(isEn ? '## What we believe — 25 points' : '## Was wir glauben — 25 Punkte', '');
  for (const a of input.articles) {
    const title = stripRichTags(`${a.titlePrefix}${a.accent}${a.titleSuffix ?? ''}`);
    lines.push(`### ${a.num}. ${title}`, '');
    lines.push(stripRichTags(a.body), '');
    lines.push(`_${a.refs}_`, '');
    for (const d of a.detail ?? []) {
      lines.push(stripRichTags(d.text), '');
      if (d.refs) lines.push(`_${d.refs}_`, '');
    }
  }

  lines.push(`Site: ${SITE_URL}/${input.lang}/about`, '');
  return md(lines.join('\n'), 200);
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface PostListItemInput {
  slug: string;
  title: string;
  publishedAt: string | null;
  author: string | null;
  excerpt: string | null;
}

export function buildPostsIndexMarkdown(posts: PostListItemInput[], apiOrigin: string): ReturnType<typeof md> {
  const lines = ['# sdarm.life — Posts', ''];
  for (const p of posts) {
    lines.push(`## ${p.title}`, '');
    const date = p.publishedAt ? p.publishedAt.slice(0, 10) : null;
    if (date) lines.push(`- Date: ${date}`);
    if (p.author) lines.push(`- Author: ${p.author}`);
    if (p.excerpt) lines.push(`- ${p.excerpt}`);
    lines.push(`- Site: ${SITE_URL}/de/posts/${p.slug}`);
    lines.push(`- Markdown: ${apiOrigin}/api/v1/llm/posts/${p.slug}`, '');
  }
  return md(lines.join('\n'), 200);
}

export interface PostDetailInput {
  title: string;
  slug: string;
  publishedAt: string | null;
  author: string | null;
  excerpt: string | null;
  body: string | null;
}

export function buildPostMarkdown(post: PostDetailInput): ReturnType<typeof md> {
  const lines = [`# ${post.title}`, ''];
  const date = post.publishedAt ? post.publishedAt.slice(0, 10) : null;
  if (date) lines.push(`Date: ${date}`);
  if (post.author) lines.push(`Author: ${post.author}`);
  lines.push('');
  if (post.excerpt) lines.push(post.excerpt, '');
  if (post.body) lines.push(post.body, '');
  lines.push(`Site: ${SITE_URL}/de/posts/${post.slug}`, '');
  return md(lines.join('\n'), 200);
}

// ── Songbooks ─────────────────────────────────────────────────────────────────

export interface SongbookListItemInput {
  slug: string;
  title: string;
  language: string;
  description: string | null;
  songCount: number;
}

export function buildSongbooksIndexMarkdown(books: SongbookListItemInput[], apiOrigin: string): ReturnType<typeof md> {
  const lines = ['# sdarm.life — Songbooks', ''];
  for (const b of books) {
    lines.push(`## ${b.title}`, '');
    lines.push(`- Language: ${b.language}`);
    if (b.description) lines.push(`- ${b.description}`);
    lines.push(`- Songs: ${b.songCount}`);
    lines.push(`- Markdown: ${apiOrigin}/api/v1/llm/songbooks/${b.slug}`, '');
  }
  return md(lines.join('\n'), 200);
}

export interface SongPartInput {
  label: string;
  sortOrder: number;
  lyrics: string;
}

export interface SongEntryInput {
  id: number;
  number: number;
  title: string;
  author: string | null;
  copyright: string | null;
  parts: SongPartInput[];
}

function songBlock(song: SongEntryInput, songbookSlug: string): string[] {
  const lines = [`## ${song.number}. ${song.title}`, ''];
  if (song.author) lines.push(`Author: ${song.author}`);
  if (song.copyright) lines.push(`Copyright: ${song.copyright}`);
  lines.push('');
  for (const part of song.parts) {
    lines.push(`**${part.label}**`, '');
    lines.push(stripChords(part.lyrics), '');
  }
  lines.push(`Site: ${SONGBOOK_URL}/de/songbooks/${songbookSlug}/${song.id}`, '');
  return lines;
}

export interface SongbookFullInput {
  slug: string;
  title: string;
  language: string;
  description: string | null;
  songs: SongEntryInput[];
}

export function buildSongbookMarkdown(book: SongbookFullInput): ReturnType<typeof md> {
  const lines = [`# ${book.title} (${book.language})`, ''];
  if (book.description) lines.push(book.description, '');
  for (const song of book.songs) lines.push(...songBlock(song, book.slug));
  return md(lines.join('\n'), 200);
}

export function buildSongMarkdown(song: SongEntryInput, songbookSlug: string, songbookTitle: string): ReturnType<typeof md> {
  const lines = [`# ${songbookTitle}`, '', ...songBlock(song, songbookSlug)];
  return md(lines.join('\n'), 200);
}

// ── Treasures ─────────────────────────────────────────────────────────────────

export interface TreasureListItemInput {
  id: number;
  title: string;
  author: string | null;
  language: string;
  description: string | null;
  isFree: boolean;
  price: string | null;
}

export function buildTreasuresMarkdown(items: TreasureListItemInput[]): ReturnType<typeof md> {
  const lines = ['# sdarm.life — Treasures (book catalogue)', ''];
  for (const t of items) {
    lines.push(`## ${t.title}`, '');
    if (t.author) lines.push(`- Author: ${t.author}`);
    lines.push(`- Language: ${t.language}`);
    lines.push(`- ${t.isFree ? 'Free' : `Price: ${t.price ?? 'n/a'}`}`);
    if (t.description) lines.push(`- ${t.description}`);
    lines.push(`- Site: ${TREASURES_URL}/de/books/${t.id}`, '');
  }
  return md(lines.join('\n'), 200);
}

// ── Bible ─────────────────────────────────────────────────────────────────────

export interface BibleTranslationListItemInput {
  code: string;
  name: string;
  abbreviation: string;
  language: string;
  year: number;
  licenseBasis: string;
  notice: string | null;
}

export function buildBibleIndexMarkdown(items: BibleTranslationListItemInput[], apiOrigin: string): ReturnType<typeof md> {
  const lines = ['# sdarm.life — Bible (locally-hosted translations)', ''];
  if (items.length === 0) {
    lines.push('No locally-hosted translation is currently enabled for download.', '');
  }
  for (const t of items) {
    lines.push(`## ${t.name} (${t.abbreviation})`, '');
    lines.push(`- Language: ${t.language}`);
    if (t.year) lines.push(`- Year: ${t.year}`);
    lines.push(`- License: ${t.licenseBasis}`);
    if (t.notice) lines.push(`- ${t.notice}`);
    lines.push(`- Markdown: ${apiOrigin}/api/v1/llm/bible/${t.code}`, '');
  }
  return md(lines.join('\n'), 200);
}

export interface BibleBookListItemInput {
  code: string;
  name: string;
  testament: 'OT' | 'NT';
  chapterCount: number;
}

export function buildBibleBooksMarkdown(
  translationName: string,
  notice: string | null,
  books: BibleBookListItemInput[],
  apiOrigin: string,
  code: string,
): ReturnType<typeof md> {
  const lines = [`# ${translationName} — Books`, ''];
  if (notice) lines.push(notice, '');
  for (const testament of ['OT', 'NT'] as const) {
    const group = books.filter((b) => b.testament === testament);
    if (group.length === 0) continue;
    lines.push(testament === 'OT' ? '## Old Testament' : '## New Testament', '');
    for (const b of group) {
      lines.push(`- ${b.name} (${b.code}) — ${b.chapterCount} chapters — ${apiOrigin}/api/v1/llm/bible/${code}/${b.code}`);
    }
    lines.push('');
  }
  return md(lines.join('\n'), 200);
}

export interface BibleVerseRow {
  chapter: number;
  verse: number;
  text: string;
}

export function buildBibleBookMarkdown(opts: {
  translationName: string;
  notice: string | null;
  bookName: string;
  verses: BibleVerseRow[];
  truncated: boolean;
  maxVerses: number | null;
}): ReturnType<typeof md> {
  const { translationName, notice, bookName, verses, truncated, maxVerses } = opts;
  const lines = [`# ${translationName} — ${bookName}`, ''];
  if (notice) lines.push(notice, '');

  let currentChapter: number | null = null;
  for (const v of verses) {
    if (v.chapter !== currentChapter) {
      currentChapter = v.chapter;
      lines.push(`## ${bookName} ${v.chapter}`, '');
    }
    lines.push(`${v.verse} ${v.text}`);
  }
  lines.push('');

  if (truncated) {
    lines.push(`_Truncated to the first ${maxVerses} verses per this translation's license._`, '');
  }
  if (notice) lines.push(notice, '');
  return md(lines.join('\n'), 200);
}
