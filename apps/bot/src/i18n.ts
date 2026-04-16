export type Lang = 'ru' | 'en';
export const DEFAULT_LANG: Lang = 'ru';

export interface Strings {
  // ── Buttons ───────────────────────────────────────────────────────────────
  btn_songbooks: string;
  btn_search: string;
  btn_contact: string;
  btn_back_menu: string;
  btn_back_list: string;
  btn_switch: string;
  btn_switch_short: string;
  btn_home: string;
  btn_contact_short: string;
  btn_lang: string;
  btn_lang_ru: string;
  btn_lang_en: string;
  btn_resume: (title: string) => string;
  btn_show_chords: string;
  btn_hide_chords: string;

  // ── Screens ───────────────────────────────────────────────────────────────
  welcome: string;
  songbooks_header: string;
  songbooks_empty: string;

  // ── Search ────────────────────────────────────────────────────────────────
  search_hint: string;
  search_prompt: string;
  search_no_results: (q: string) => string;
  search_header: (q: string) => string;
  search_truncated: (shown: number, total: number) => string;

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

  // ── Language ──────────────────────────────────────────────────────────────
  lang_choose: string;
  lang_set: (name: string) => string;

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

const ru: Strings = {
  btn_songbooks: '📚  Сборники',
  btn_search: '🔍  Поиск',
  btn_contact: '✉️  Разработчик',
  btn_back_menu: '‹  Меню',
  btn_back_list: '‹  К списку',
  btn_switch: '📚  Сборники',
  btn_switch_short: '📚  Сборники',
  btn_home: '🏠  Меню',
  btn_contact_short: '✉️  Связаться',
  btn_lang: '🌐  Язык / Language',
  btn_lang_ru: '🇷🇺  Русский ✓',
  btn_lang_en: '🇬🇧  English',
  btn_resume: (title) => `▶  ${title}`,
  btn_show_chords: '🎸  Аккорды',
  btn_hide_chords: '📝  Только текст',

  welcome: ['🎵 *Breezify*', '_карманный песенник_', '', 'Листай или ищи:'].join('\n'),

  songbooks_header: '📚 *Сборники*\n\n_Выбери коллекцию:_',
  songbooks_empty: 'Сборников пока нет\\.',

  search_hint: [
    '🔍 *Как найти песню:*',
    '',
    '`42` — по номеру',
    '`Благодать` — по названию',
    '`я был слеп` — по строчке',
    '',
    '_Или просто напиши — найду\\._',
  ].join('\n'),
  search_prompt: '🔍 *Что ищем?*\n\n`/search 42`\n`/search Благодать`\n`/search я был слеп`',
  search_no_results: (q) => `🔍 *«${q}»*\n\nНичего не найдено\\.\nПопробуй другое слово или номер\\.`,
  search_header: (q) => `🔍 *«${q}»*`,
  search_truncated: (shown, total) => `_Первые ${shown} из ${total} — уточни запрос\\._\n\n`,

  song_list_meta: (lang, total, page, pages) => `_${lang.toUpperCase()} · ${total} песен · ${page}/${pages}_`,
  no_songs: 'Песен пока нет\\.',

  part_verse: 'Куплет',
  part_chorus: 'Припев',
  part_bridge: 'Мост',
  part_intro: 'Вступление',
  part_outro: 'Заключение',
  part_coda: 'Кода',

  lang_choose: '🌐 *Язык интерфейса:*',
  lang_set: (name) => `✓ Язык: *${name}*`,

  err_books: '⚠ Не удалось загрузить\\. Попробуй позже\\.',
  err_songs: '⚠ Не удалось загрузить\\. Попробуй позже\\.',
  err_song: '⚠ Не удалось загрузить\\. Попробуй позже\\.',
  err_search: '⚠ Ошибка поиска\\. Попробуй позже\\.',
  err_general: '⚠ Что\\-то пошло не так\\. Попробуй ещё раз\\.',
  rate_limit: '⏳ Помедленнее\\.',
  min_chars: '_Введи хотя бы 2 символа\\._',

  help: [
    '🎵 *Breezify — карманный песенник*',
    '',
    '`/start` · `/songbooks` · `/lang`',
    '',
    '*Поиск:*',
    '`42` — номер',
    '`Благодать` — название',
    '`я был слеп` — строчка из текста',
    '',
    '_Или просто напиши — найду\\._',
  ].join('\n'),
};

const en: Strings = {
  btn_songbooks: '📚  Collections',
  btn_search: '🔍  Search',
  btn_contact: '✉️  Developer',
  btn_back_menu: '‹  Menu',
  btn_back_list: '‹  Back',
  btn_switch: '📚  Collections',
  btn_switch_short: '📚  Collections',
  btn_home: '🏠  Menu',
  btn_contact_short: '✉️  Contact',
  btn_lang: '🌐  Язык / Language',
  btn_lang_ru: '🇷🇺  Русский',
  btn_lang_en: '🇬🇧  English ✓',
  btn_resume: (title) => `▶  ${title}`,
  btn_show_chords: '🎸  Chords',
  btn_hide_chords: '📝  Lyrics only',

  welcome: ['🎵 *Breezify*', '_your pocket hymnbook_', '', 'Browse or search:'].join('\n'),

  songbooks_header: '📚 *Collections*\n\n_Pick a songbook:_',
  songbooks_empty: 'No songbooks yet\\.',

  search_hint: [
    '🔍 *How to find a song:*',
    '',
    '`42` — by number',
    '`Amazing grace` — by title',
    '`I once was lost` — by line',
    '',
    "_Or just type — I\\'ll find it\\._",
  ].join('\n'),
  search_prompt: '🔍 *Looking for?*\n\n`/search 42`\n`/search Amazing grace`\n`/search I was blind`',
  search_no_results: (q) => `🔍 *"${q}"*\n\nNothing found\\.\nTry another word or number\\.`,
  search_header: (q) => `🔍 *"${q}"*`,
  search_truncated: (shown, total) => `_Top ${shown} of ${total} — refine your query\\._\n\n`,

  song_list_meta: (lang, total, page, pages) => `_${lang.toUpperCase()} · ${total} songs · ${page}/${pages}_`,
  no_songs: 'No songs yet\\.',

  part_verse: 'Verse',
  part_chorus: 'Chorus',
  part_bridge: 'Bridge',
  part_intro: 'Intro',
  part_outro: 'Outro',
  part_coda: 'Coda',

  lang_choose: '🌐 *Interface language:*',
  lang_set: (name) => `✓ Language: *${name}*`,

  err_books: '⚠ Failed to load\\. Try again\\.',
  err_songs: '⚠ Failed to load\\. Try again\\.',
  err_song: '⚠ Failed to load\\. Try again\\.',
  err_search: '⚠ Search error\\. Try again\\.',
  err_general: '⚠ Something went wrong\\. Try again\\.',
  rate_limit: '⏳ Slow down\\.',
  min_chars: '_Type at least 2 characters\\._',

  help: [
    '🎵 *Breezify — pocket hymnbook*',
    '',
    '`/start` · `/songbooks` · `/lang`',
    '',
    '*Search:*',
    '`42` — number',
    '`Amazing grace` — title',
    '`I once was lost` — lyrics line',
    '',
    "_Or just type — I\\'ll find it\\._",
  ].join('\n'),
};

export function getT(lang: Lang): Strings {
  return lang === 'ru' ? ru : en;
}
