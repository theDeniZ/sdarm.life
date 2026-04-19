/**
 * Single-locale strings for the bot. English only.
 *
 * Per `apps/bot/CLAUDE.md`: no language selection, no per-user lang state.
 * Kept as a frozen `STR` object so callers can `import { STR } from './i18n'`
 * and reach any field directly.
 *
 * Style rules baked in:
 *   - No standard emojis. Decoration via bold/italic/`·`/`—`/`‹›` glyphs only.
 *   - Counts use `· N`, never `(N)`.
 *   - Sentences are short and calm — no decorative ASCII lines, no exclamations.
 */

export interface Strings {
  // ── Buttons ───────────────────────────────────────────────────────────────
  btn_songbooks: string;
  btn_search: string;
  btn_about: string;
  btn_contact_link: string;
  btn_back_menu: string;
  btn_back_list: string;
  btn_switch: string;
  btn_home: string;
  btn_resume: (title: string) => string;
  btn_show_chords: string;
  btn_hide_chords: string;
  btn_search_global: string;
  btn_retry: string;

  // ── Screens ───────────────────────────────────────────────────────────────
  welcome: string;
  songbooks_header: string;
  songbooks_empty: string;
  about_body: string;

  // ── Search ────────────────────────────────────────────────────────────────
  search_hint: string;
  search_prompt: string;
  search_no_results: (q: string) => string;
  search_header: (q: string) => string;
  search_truncated: (shown: number, total: number) => string;
  search_in_book_header: (q: string, book: string) => string;

  // ── Song list ─────────────────────────────────────────────────────────────
  song_list_meta: (lang: string, total: number, page: number, pages: number) => string;
  no_songs: string;

  // ── Part type labels ──────────────────────────────────────────────────────
  part_verse: string;
  part_chorus: string;
  part_bridge: string;
  part_intro: string;
  part_outro: string;
  part_coda: string;

  // ── Errors & misc ─────────────────────────────────────────────────────────
  err_books: string;
  err_songs: string;
  err_song: string;
  err_search: string;
  err_general: string;
  rate_limit: string;
  min_chars: string;
  long_song_no_chords: string;
  help: string;
}

export const STR: Strings = {
  // Buttons
  btn_songbooks: 'Songbooks',
  btn_search: 'Search',
  btn_about: 'About',
  btn_contact_link: 'Contact',
  btn_back_menu: '‹ Menu',
  btn_back_list: '‹ Back to list',
  btn_switch: 'Songbooks',
  btn_home: 'Menu',
  btn_resume: (title) => `Resume · ${title}`,
  btn_show_chords: 'Show chords',
  btn_hide_chords: 'Hide chords',
  btn_search_global: 'Search all collections',
  btn_retry: 'Try again',

  // Screens
  welcome: '*Breezify*\n_pocket hymnbook_\n\nBrowse or search:',
  songbooks_header: '*Collections*\n\n_Pick one:_',
  songbooks_empty: 'No collections yet\\.',
  about_body: [
    '*About Breezify*',
    '',
    'A pocket hymnbook for SDARM congregations\\.',
    'Browse collections, search by number, title or lyrics, toggle chords on the fly\\.',
    '',
    'Found a bug or want to add a song? Tap *Contact* below\\.',
  ].join('\n'),

  // Search
  search_hint: [
    '*How to search:*',
    '',
    '`42` · by number',
    '`Amazing grace` · by title',
    '`I once was lost` · by line',
    '',
    "_Or just type — I\\'ll find it\\._",
  ].join('\n'),
  search_prompt: '*Looking for?*\n\n`/search 42`\n`/search Amazing grace`\n`/search I was blind`',
  search_no_results: (q) => `*"${q}"*\n\nNothing found\\.\nTry another word or number\\.`,
  search_header: (q) => `*"${q}"*`,
  search_truncated: (shown, total) => `_Top ${shown} of ${total} · refine your query\\._\n\n`,
  search_in_book_header: (q, book) => `*"${q}"* in _${book}_`,

  // Song list
  song_list_meta: (lang, total, page, pages) => `_${lang.toUpperCase()} · ${total} songs · ${page}/${pages}_`,
  no_songs: 'No songs yet\\.',

  // Part labels
  part_verse: 'Verse',
  part_chorus: 'Chorus',
  part_bridge: 'Bridge',
  part_intro: 'Intro',
  part_outro: 'Outro',
  part_coda: 'Coda',

  // Errors & misc
  err_books: 'Could not load collections\\. Try again in a moment\\.',
  err_songs: 'Could not load songs\\. Try again in a moment\\.',
  err_song: 'Could not load this song\\. Try again in a moment\\.',
  err_search: 'Search error\\. Try again in a moment\\.',
  err_general: 'Something went wrong\\. Try again in a moment\\.',
  rate_limit: 'Too fast — wait about a minute and retry\\.',
  min_chars: '_Type at least 2 characters\\._',
  long_song_no_chords: '_This song is too long for inline chord toggle\\._',

  help: [
    '*Breezify · pocket hymnbook*',
    '',
    '`/start` · `/songbooks` · `/about`',
    '',
    '*Search:*',
    '`42` · number',
    '`Amazing grace` · title',
    '`I once was lost` · lyrics line',
    '',
    "_Or just type — I\\'ll find it\\._",
  ].join('\n'),
};
