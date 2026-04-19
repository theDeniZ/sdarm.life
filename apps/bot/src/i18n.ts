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
  btn_settings: string;
  btn_contact_link: string;
  btn_back_menu: string;
  btn_resume: (title: string) => string;
  btn_search_global: string;
  btn_retry: string;
  btn_mute_notifications: string;
  btn_unmute_notifications: string;

  // ── Screens ───────────────────────────────────────────────────────────────
  welcome_header: string;
  welcome_stats: (collections: number, songs: number) => string;
  welcome_cta: string;
  songbooks_header: string;
  songbooks_empty: string;
  about_body: string;
  settings_body: string;
  notify_status: (on: boolean) => string;
  notify_new_song_header: string;
  notify_muted_confirm: string;
  notify_unmuted_confirm: string;

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
  help: string;
}

export const STR: Strings = {
  // Buttons
  btn_songbooks: 'Songbooks',
  btn_search: 'Search',
  btn_about: 'About',
  btn_settings: 'Settings',
  btn_contact_link: 'Contact',
  btn_back_menu: '↑',
  btn_resume: (title) => `Resume · ${title}`,
  btn_search_global: 'Search all collections',
  btn_retry: 'Try again',
  btn_mute_notifications: 'Stop notifications',
  btn_unmute_notifications: 'Enable notifications',

  // Screens
  welcome_header: '*Breezify*\n_pocket hymnbook_',
  welcome_stats: (collections, songs) =>
    `_${collections} ${collections === 1 ? 'collection' : 'collections'} · ${songs} songs_`,
  welcome_cta: 'Browse or search:',
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
  settings_body: '*Settings*',
  notify_status: (on) => (on ? '_New\\-song notifications: on_' : '_New\\-song notifications: off_'),
  notify_new_song_header: 'New song added',
  notify_muted_confirm: '_Notifications muted\\. You can re\\-enable them in About\\._',
  notify_unmuted_confirm: '_Notifications enabled\\._',

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

  help: [
    '*Breezify · pocket hymnbook*',
    '',
    '*Commands*',
    '`/start` · `/songbooks` · `/search` · `/settings` · `/about`',
    '',
    '*Search*',
    '`42` · by number',
    '`Amazing grace` · by title',
    '`I once was lost` · by line',
    '',
    "_Or just type — I\\'ll find it\\._",
    '',
    '*Icons*',
    '`♯ ♯✓` · show / hide chords',
    '`‹ ›` · previous / next page',
    '`↑` · go up one level',
    '`□` · open full screen',
    '`−` · mute notifications',
  ].join('\n'),
};
