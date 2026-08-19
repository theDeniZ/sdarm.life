/* The SBL Edition engine, ported from the single-page original.
 *
 * It is one function on purpose. The lesson half and the marker half call each
 * other both ways and share mutable state — the language being read, the mode
 * the pencil is in, which lesson is on screen — so splitting them into modules
 * would mean threading that state through a context object, a pervasive edit to
 * the most delicate code in the app for no behavioural gain. Everything that is
 * genuinely free of that state lives outside: api.ts.
 *
 * Changes from the original, and only these: the two upstream URLs go through
 * our Worker (see api.ts), element lookups go through byId(), two `this`
 * call sites became explicit locals, and the service worker is registered by
 * the React shell instead of here.
 */
import { bibleUrl, quarterUrl } from './api';
import type {
  BibleBooks,
  BibleEdition,
  Dict,
  Lesson,
  MarkSpan,
  PageMarks,
  Phrase,
  Quarter,
  Sop,
  Subsection,
  VerseTask,
} from './types';

/* Every id below is rendered by SblApp.tsx, so the lookup cannot miss. Where
 * the original genuinely expected a miss it still checks the result. */
function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/* The same promise for a selector: the rail and the sheet are rendered by
 * SblApp.tsx, so what is asked for by class or attribute is there. */
function byQuery<T extends HTMLElement = HTMLElement>(sel: string): T {
  return document.querySelector(sel) as T;
}

/* A range can end in a text node, and an event can fire on one; the engine
 * probes for closest() before it trusts a node to be an element. This says the
 * same thing in one place, and hands back the element when there is one. */
function asElem(n: Node | EventTarget | null | undefined): HTMLElement | null {
  return n && (n as HTMLElement).closest ? (n as HTMLElement) : null;
}

/* React runs an effect twice in development (StrictMode) and the engine binds
 * listeners to document and window that it never unbinds. Mounting it a second
 * time over the same DOM would double every key press. */
let started = false;

export function initSbl({ apiUrl }: { apiUrl: string }): void {
  if (started) return;
  started = true;

  const LANGS = ['de', 'en', 'ru'];
  const LOCALE: Dict = { de: 'de-DE', en: 'en-US', ru: 'ru-RU' };
  const MEMLABEL: Dict = { de: 'Merktext', en: 'Memory verse', ru: 'Памятный стих' };
  let lang = localStorage.getItem('sbl.lang') || localStorage.getItem('sbl.left') || 'en';
  if (LANGS.indexOf(lang) === -1) lang = 'en';
  let current = new Date();
  const quarters: Record<string, Quarter | null> = {};
  const BIBLE: Dict = { de: 'de-lut', en: 'en-kjv', ru: 'ru-rst' };
  const bibles: Record<string, Promise<BibleEdition | null> | null> = {};
  let versesOn = localStorage.getItem('sbl.verses') === '1';
  let versesLines = localStorage.getItem('sbl.verselines') === '1'; /* one verse per line */
  /* Two lessons at once: the whole booklet twice, in two languages, side by side.
   Kept apart from the parallel of verses below — that one sets one passage
   against another inside a single lesson, this one sets the entire sheet
   against its own translation, and each side is read, scrolled and marked on
   its own. */
  let dualOn_ = localStorage.getItem('sbl.dual') === '1';
  let dualLang = localStorage.getItem('sbl.duallang') || '';

  /* Parallel reading: a second translation beside the one the lesson is in.
   Kept apart from `versesOn` on purpose — the reader turns it on once and it
   stays on through language changes and reloads, like every other setting. */
  let paraOn = localStorage.getItem('sbl.para') === '1';
  let paraVer = localStorage.getItem('sbl.paraver') || '';
  /* every edition app.sdarm.org serves, in the order the picker lists them:
   [language tag, file id, the name it is known by] */
  const PARA: [string, string, string][] = [
    ['DE', 'de-lut', 'Luther Bibel'],
    ['EN', 'en-kjv', 'King James Version'],
    ['EN', 'en-nkjv', 'New King James Version'],
    ['EN', 'en-esv', 'English Standard Version'],
    ['EN', 'en-niv', 'New International Version'],
    ['EN', 'en-nasb', 'New American Standard Bible'],
    ['EN', 'en-nlt', 'New Living Translation'],
    ['EN', 'en-amp', 'Amplified Bible'],
    ['EN', 'en-web', 'World English Bible'],
    ['EN', 'en-net', 'New English Translation'],
    ['EN', 'en-ylt', "Young's Literal Translation"],
    ['RU', 'ru-rst', 'Синодальный перевод'],
    ['ES', 'es-rvr1960', 'Reina Valera 1960'],
    ['ES', 'es-nvi', 'Nueva Versión Internacional'],
    ['PT', 'pt-acf', 'Almeida Corrigida e Fiel'],
    ['PT', 'pt-nvi', 'Nova Versão Internacional'],
    ['RO', 'ro-vdc', 'Dumitru Cornilescu'],
    ['CS', 'cs-bkr', 'Bible Kralická'],
  ];
  /* Two columns need the room for two columns, and room is width — nothing else.
   An earlier version asked for landscape instead, and that made the setting
   impossible to find: on one tablet it was there, on the next it was not, for
   reasons the reader could not see. Width alone can be explained in one
   sentence, and the numbers are chosen against real tablets rather than picked
   round:

     iPad 10.2"  upright  810 · lying 1080
     iPad Air    upright  820 · lying 1180
     iPad Pro 13 upright 1024 · lying 1366

   1040 puts every tablet lying down above the line and every one standing up
   below it — including the big Pro, whose 1024 upright was the width that used
   to let two columns in and then squeeze them. Two whole lessons need far more
   than two columns of verses do: a booklet is set for 820, and below 1280 the
   two of them start eating each other.

   Under the line nothing is lost — the second translation is still one gesture
   away, under a held verse. */
  const PARA_MQ = matchMedia('(min-width:1040px)');
  const DUAL_MQ = matchMedia('(min-width:1280px)');
  function paraFits() {
    return PARA_MQ.matches;
  }
  /* the second column has to be a second translation: whatever the lesson is
   already set in cannot stand beside itself */
  /* One function, one answer: this says what is actually set beside the verses on
   screen. It has to know about the two-language view, because that view takes
   the second column for itself — otherwise the held-verse gesture steps aside
   for a column that was never drawn, and nothing answers at all. */
  function paraPick() {
    return !dualOn() && paraOn && paraFits() && paraVer && paraVer !== BIBLE[lang] ? paraVer : '';
  }
  /* two full sheets need the width of two — a good deal more than two columns of
   verses do; below that the setting is kept and simply has nowhere to go */
  function dualFits() {
    return DUAL_MQ.matches;
  }
  function dualOn() {
    return dualOn_ && dualFits();
  }
  function dualOther() {
    return dualLang && dualLang !== lang
      ? dualLang
      : LANGS.filter(function (l) {
          return l !== lang;
        })[0];
  }

  /* band colour themes — first colour matches the quarterly cover (navy + light) */
  const THEMES = [
    { dk: '#606162', lt: '#d1d3d4', bx: '#e6e6e6' } /* grey (default) */,
    { dk: '#24426e', lt: '#ccd5e2', bx: '#e7ecf4' } /* navy — cover */,
    /* paper — the bands in the tone of the sheet instead of a colour, so the
     booklet reads as one printing: kraft band, brown ink, no second hue on the
     page at all. Wine stood here before and any colour is a tap away in the
     custom swatch, so nothing is lost by giving the seat to this one. */
    { dk: '#6b5f4b', lt: '#ddd5c3', bx: '#ece6d8' } /* paper */,
    { dk: '#2f5140', lt: '#cfdfd6', bx: '#e7f0ea' } /* forest */,
    { dk: '#8f7328', lt: '#e6dabb', bx: '#f2ecd8' } /* gold */,
  ];
  function setTint(t: { dk: string; lt: string; bx: string }) {
    const R = document.documentElement.style;
    R.setProperty('--gray-dk', t.dk);
    R.setProperty('--gray', t.lt);
    R.setProperty('--box', t.bx);
  }
  function hexHsl(h: string) {
    h = h.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) / 255,
      g = parseInt(h.slice(2, 4), 16) / 255,
      b = parseInt(h.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b);
    let hh, s;
    const l = (mx + mn) / 2;
    if (mx === mn) {
      hh = s = 0;
    } else {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh /= 6;
    }
    return [Math.round(hh * 360), Math.round(s * 100)];
  }
  /* one hue in, three tones out. The lightnesses are the printed booklet's own:
   38% carries white lettering on the day tag, 84% and 90% stay light enough to
   read black type through. Only the hue is the reader's — see .huebar. */
  function hueTint(h: number) {
    return { dk: 'hsl(' + h + ',46%,38%)', lt: 'hsl(' + h + ',30%,84%)', bx: 'hsl(' + h + ',21%,90%)' };
  }
  let hueOwn = 210; /* where the strip's dot sits until the reader moves it */
  let hueActive = false; /* is the page wearing a hue of its own, or a theme */
  (function () {
    try {
      const s = JSON.parse(localStorage.getItem('sbl.tint') || 'null');
      if (!s) return;
      /* {c:"#rrggbb"} is how a custom colour was kept before the strip: the hue of
     it is all that ever reached the page, so that is what is read back */
      if (s.h != null) {
        hueOwn = s.h;
        hueActive = true;
        setTint(hueTint(s.h));
      } else if (s.c) {
        hueOwn = hexHsl(s.c)[0];
        hueActive = true;
        setTint(hueTint(hueOwn));
      } else if (s.i != null && THEMES[s.i]) setTint(THEMES[s.i]);
    } catch {
      /* nothing to do: the page carries on without it */
    }
  })();

  /* the paper grain — classes on <html>, set before the first sheet is drawn so
   the reader never sees the white flash of a setting arriving late */
  const PAPERS = ['grain', 'dust'];
  let paperKind = '';
  try {
    const p = localStorage.getItem('sbl.paper') || '';
    if (PAPERS.indexOf(p) >= 0) paperKind = p;
  } catch {
    /* nothing to do: the page carries on without it */
  }
  /* The line at the foot of every printed page: what this is, and where it came
   * from. It is set in the language of the lesson, because a German reader
   * handing the PDF on should not be handing on an English footer. Written as a
   * CSS string for the @page margin box in print.css. */
  const PDF_CREDIT: Dict = {
    de: "'Sabbatschullektion · treasures.sdarm.life'",
    en: "'Sabbath Bible Lesson · treasures.sdarm.life'",
    ru: "'Урок субботней школы · treasures.sdarm.life'",
  };
  /* the round button at the head of the day strip */
  const TOTOP: Dict = { de: 'Zum Anfang der Lektion', en: 'To the start of the lesson', ru: 'В начало урока' };

  function paintCredit(l: string) {
    document.documentElement.style.setProperty('--sbl-credit', PDF_CREDIT[l] || PDF_CREDIT.en);
  }

  function paintPaper() {
    const R = document.documentElement.classList;
    R.toggle('paper', !!paperKind);
    PAPERS.forEach(function (k) {
      R.toggle('paper-' + k, paperKind === k);
    });
  }
  function setPaper(k: string) {
    paperKind = PAPERS.indexOf(k) >= 0 ? k : '';
    paintPaper();
    try {
      localStorage.setItem('sbl.paper', paperKind);
    } catch {
      /* nothing to do: the page carries on without it */
    }
  }
  /* the list speaks the language of the lesson, like every other row in ⚙ */
  function paintPaperSel() {
    const s = byId<HTMLSelectElement>('paper-sel');
    if (!s) return;
    s.innerHTML =
      '<option value="">' +
      esc(UI.paperoff[lang]) +
      '</option>' +
      PAPERS.map(function (k) {
        return '<option value="' + k + '">' + esc(UI['paper' + k][lang]) + '</option>';
      }).join('');
    s.value = paperKind;
  }
  paintPaper();

  function ymd(d: Date) {
    return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
  }
  function qOf(d: Date) {
    return Math.floor(d.getMonth() / 3) + 1;
  }
  function addDays(d: Date, n: number) {
    const x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }
  function neigh(y: number, q: number) {
    return [[y, q], q === 1 ? [y - 1, 4] : [y, q - 1], q === 4 ? [y + 1, 1] : [y, q + 1]];
  }
  function esc(s: unknown) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function strip(s: unknown) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, '');
  }
  function cleanMem(raw: unknown) {
    let t = String(raw || '').trim();
    const qi = t.search(/[„“"«]/);
    if (qi > 0 && qi <= 42) {
      const ci = t.lastIndexOf(':', qi);
      if (ci >= 0 && ci < qi) t = t.slice(ci + 1).trim();
    }
    return t;
  }
  function isJunk(s: unknown) {
    return /out of date|install the (new|latest) version|Google Play|App ?store|version installed on your device/i.test(
      String(s || '')
    );
  }
  function ymdToDate(s: string) {
    return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  }
  /* The language of the sheet being built at this moment. Everything a lesson
   sets — the date, the label of the memory verse, which Bible it quotes — reads
   this and not the setting, so a second sheet in another language can be built
   beside the first without either knowing about the other. Outside `renderLesson`
   it is simply the language of the page. */
  let rlang = lang;
  function fmt(dstr: string, opts: Intl.DateTimeFormatOptions) {
    try {
      return new Intl.DateTimeFormat(LOCALE[rlang], opts).format(ymdToDate(dstr));
    } catch {
      return dstr;
    }
  }

  async function loadQuarter(l: string, y: number, q: number) {
    const key = l + '-' + y + '-' + q;
    if (quarters[key]) return quarters[key];
    busy(true);
    try {
      const r = await fetch(quarterUrl(apiUrl, l, y, q));
      if (!r.ok) throw 0;
      return (quarters[key] = await r.json());
    } catch {
      return (quarters[key] = null);
    } finally {
      busy(false);
    }
  }
  async function findLesson(d: Date, l: string) {
    const t = ymd(d);
    for (const [y, q] of neigh(d.getFullYear(), qOf(d))) {
      const data = await loadQuarter(l, y, q);
      if (!data || !data.lessons) continue;
      for (const les of data.lessons) {
        const days = les.dailyLessons || [];
        const start = days.length ? days[0].date : les.date;
        if (t >= start && t <= les.date) return les;
      }
    }
    return null;
  }

  /* ——— the page says when it is still waiting ———
   A Bible edition is four to six megabytes, and the lesson is set long before
   one arrives: the sheet looks finished, its verse boxes stand empty, and
   nothing on screen says that anything is still on its way. That silence is
   what reads as a freeze — and it is worst exactly where the wait is longest,
   on the whole quarter and on a change of language, which needs a different
   edition altogether. */
  let busyN = 0;
  function busy(on: boolean) {
    busyN = Math.max(0, busyN + (on ? 1 : -1));
    document.body.classList.toggle('loading', busyN > 0);
  }
  function loadBible(v: string) {
    if (bibles[v]) return bibles[v];
    busy(true);
    return (bibles[v] = fetch(bibleUrl(apiUrl, v))
      .then((r) => r.json())
      .catch(function () {
        bibles[v] = null;
        return null;
      })
      .finally(function () {
        busy(false);
      }));
  }
  /* A reference with no verse number means the whole chapter: "Rev.16", or
   "Rev.2-Rev.3" for a span of them. Infinity is clamped to the chapter length
   where the verses are actually read. */
  function parseSeg(s: string) {
    const d = s.split('-');
    const a = d[0].split('.');
    const b = (d[1] || d[0]).split('.');
    return {
      book: a[0],
      chap: +a[1],
      v1: a[2] != null ? +a[2] : 1,
      echap: +(b[1] || a[1]),
      v2: b[2] != null ? +b[2] : Infinity,
    };
  }
  /* Every verse carries its own address — `data-vr="John.3.16"` — so that a finger
   held on it can be answered with that one verse in the second translation (see
   `peekOpen`). In running text this needs a wrapper the verse did not have
   before: `.vr` styles nothing, it only gives the verse an outline to be found
   by. It is safe for the pencil — marks are stored as character offsets inside
   the block, counted over text nodes, and a wrapper adds no character. */
  function verseHtml(books: BibleBooks | null, sOsis: string, perLine: boolean) {
    let out = '';
    for (const raw of String(sOsis).split(',')) {
      const s = parseSeg(raw.trim());
      const ch = books && books[s.book];
      if (!ch) continue;
      for (let c = s.chap; c <= s.echap; c++) {
        const vs = ch[c - 1];
        if (!vs) continue;
        const from = c === s.chap ? s.v1 : 1,
          to = Math.min(c === s.echap ? s.v2 : vs.length, vs.length);
        for (let n = from; n <= to; n++)
          if (vs[n - 1] != null) {
            const t = esc(strip(String(vs[n - 1])).trim());
            const vr = ' data-vr="' + esc(s.book) + '.' + c + '.' + n + '"';
            out += perLine
              ? '<span class="v"' + vr + '><span class="vn">' + n + '</span>' + t + '</span>'
              : '<span class="vr"' + vr + '><span class="vnum">' + n + '</span>' + t + '</span> ';
          }
      }
    }
    return perLine ? out : out.trim();
  }
  /* The same passage in two editions, verse by verse. Both columns are handed
   the same list of verse numbers — so row n is verse n on either side — and a
   verse one edition does not carry leaves its cell empty instead of pushing
   everything under it out of line. `--r` is the grid row the pair stands on.
   Row 1 belongs to the two version labels, so the verses start at 2. */
  function versePair(booksA: BibleBooks | null, booksB: BibleBooks | null, sOsis: string, perLine: boolean) {
    const rows = [];
    for (const raw of String(sOsis).split(',')) {
      const s = parseSeg(raw.trim());
      const ba = booksA && booksA[s.book],
        bb = booksB && booksB[s.book];
      for (let c = s.chap; c <= s.echap; c++) {
        const va = ba && ba[c - 1],
          vb = bb && bb[c - 1];
        /* the longer of the two settles how far "the whole chapter" reaches */
        const len = Math.max(va ? va.length : 0, vb ? vb.length : 0);
        if (!len) continue;
        const from = c === s.chap ? s.v1 : 1,
          to = Math.min(c === s.echap ? s.v2 : len, len);
        for (let n = from; n <= to; n++) {
          const ta = va && va[n - 1] != null ? esc(strip(String(va[n - 1])).trim()) : '';
          const tb = vb && vb[n - 1] != null ? esc(strip(String(vb[n - 1])).trim()) : '';
          if (ta || tb) rows.push([n, ta, tb]);
        }
      }
    }
    let a = '',
      b = '';
    /* Running text in two columns: each side is simply its own paragraph. The
     verses no longer stand level with each other — that is the price of it —
     but the passage takes half the height, and for reading straight through
     rather than comparing word against word this is the shape that is wanted. */
    if (!perLine) {
      for (const r of rows) {
        if (r[1]) a += '<span class="vnum">' + r[0] + '</span>' + r[1] + ' ';
        if (r[2]) b += '<span class="vnum">' + r[0] + '</span>' + r[2] + ' ';
      }
      return [a.trim(), b.trim()];
    }
    for (let i = 0; i < rows.length; i++) {
      /* the verses start on row 1: the editions now name themselves up in the
       reference line, so no row is spent on labels */
      const r = rows[i],
        pr = i + 1;
      a += '<span class="v" style="--r:' + pr + '"><span class="vn">' + r[0] + '</span>' + r[1] + '</span>';
      b += '<span class="v" style="--r:' + pr + '"><span class="vn">' + r[0] + '</span>' + r[2] + '</span>';
    }
    return [a, b];
  }
  /* the short name of an edition — "en-nkjv" is read as NKJV */
  function verShort(id: string) {
    return String(id).split('-')[1] || String(id);
  }
  /* The reference over the second column has to read in the language of the
   edition standing there — "John 3:5-8", not "От Иоанна 3:5-8" over an English
   text. The Bible files carry no book names, only OSIS codes, and a table of
   sixty-six names in every language is a table to get wrong. The lesson itself
   is where those names are already written correctly: the same quarter in that
   language quotes the same passages under the same `sOsis`, so the reference is
   looked up by the very key both sides share. Where the page has no lesson in
   that language — Spanish, Portuguese, Romanian, Czech — the column carries its
   edition and nothing more, which is honest and costs nothing. */
  const paraRefs: Record<string, Dict> = {};
  async function paraRefMap(l: string, y: number, q: number) {
    const key = l + '-' + y + '-' + q;
    if (paraRefs[key]) return paraRefs[key];
    const data = await loadQuarter(l, y, q),
      m: Dict = {};
    if (data && data.lessons)
      for (const les of data.lessons)
        for (const day of les.dailyLessons || [])
          for (const sub of day.subsections || [])
            for (const it of sub.q || [])
              if (it && it.sOsis && it.text) m[it.sOsis] = strip(it.text).replace(/[;,.\s]+$/, '');
    return (paraRefs[key] = m);
  }
  /* DE/RU carry the EGW source inside the quote itself ("…wecken.“ – Der Weg zu
   Christus, S. 4."). Find the book title and italicise it, so all three
   languages read the same as English — where the source arrives in `sop`.
   Runs on already-escaped text; the page reference is what proves it's a
   source and not just a dash in the sentence. */
  function inlineSource(t: string) {
    /* a dash usually opens the source; thirteen Russian commentaries use // */
    const m = t.match(/^([\s\S]*[»”“"'’″]\s*)([,.]?\s*(?:[–—-]|\/\/)\s*)([\s\S]+)$/);
    if (!m) return t;
    let p = m[3].search(/\s*[,.]?\s*[–—-]?\s*(?:S\.|p\.|pp\.|С\.|с\.|стр\.)\s*\d/);
    /* a periodical is cited by date rather than by page: "…school, 1 December 1912." */
    if (p <= 0 && /[0-9]{4}[^0-9]{0,14}$/.test(m[3])) p = m[3].lastIndexOf(',');
    if (p <= 0) return t;
    /* the whole source is set as one: the title and the page it stands on read
     as a single line of credit, not as two kinds of type */
    return m[1] + m[2] + '<i>' + m[3] + '</i>';
  }
  /* Source of an EGW quote. English data keeps it apart in `sop`; DE/RU already
   have it inside the text, so this simply returns nothing there. */
  function sopHtml(sop: Sop | undefined, text: string | undefined) {
    if (!sop || !sop.label) return '';
    const s = String(sop.label);
    const m = s.match(/<span[^>]*sop-book[^>]*>([\s\S]*?)<\/span>([\s\S]*)$/i);
    const dash = /[—–-]\s*$/.test(String(text || '').trim()) ? '' : '—';
    /* title and page together, in one italic — see inlineSource() */
    return dash + '<i>' + (m ? esc(strip(m[1]).trim()) + esc(strip(m[2])) : esc(strip(s))) + '</i>';
  }
  /* "a. How did Paul…" → ["a.", "How did Paul…"] so the marker can hold its own
   column. Latin and Cyrillic letters, and numbers for the review questions. */
  function splitMarker(t: unknown) {
    /* the space after the marker is optional — Russian data sometimes has none
     ("а.От чего…"), and putting the marker in its own column repairs that too */
    const m = String(t || '').match(/^\s*([0-9]{1,2}|[A-Za-zА-яЁё])\s*[.)]\s*([\s\S]+)$/);
    return m ? [m[1] + '.', m[2]] : null;
  }
  /* A reference must never be torn in half. "1 John 1:9" broken after the book
   name, or a chapter left on one line and its verse on the next, is the first
   thing an eye trips over — and it happens in all three languages, where the
   shapes differ: "1 John 1:9", "1. Johannes 1, 9", "От Иоанна 5:6-9". The
   spaces inside a reference are turned to hard ones, so the whole thing moves
   to the next line together or not at all. */
  const MK_REF =
    /((?:[1-3]|I{1,3})\s*\.?\s*)?([A-ZА-ЯЁ][a-zа-яёA-ZА-ЯЁ]*\.?(?:\s+[A-ZА-ЯЁ][a-zа-яё]+\.?)?)(\s+)(\d{1,3}\s*[:,]\s*\d{1,3}(?:\s*[–—-]\s*\d{1,3})?(?:\s*,\s*\d{1,3}(?:\s*[–—-]\s*\d{1,3})?)*)/g;
  function mkGlue(h: string) {
    /* hard spaces alone are not enough: with hyphens:auto the browser will still
     break inside the book name — "Jo-hannes 1, 7" — so the reference is also
     told not to hyphenate */
    return String(h).replace(MK_REF, function (m) {
      return '<span class="ref">' + m.replace(/\s+/g, '\u00A0') + '</span>';
    });
  }
  function markedHtml(cls: string, t: string, k: string) {
    const s = splitMarker(t),
      a = ' class="' + cls + '"' + (k ? ' data-k="' + k + '"' : '');
    return s
      ? '<div' + a + '><span class="qm">' + esc(s[0]) + '</span>' + mkGlue(esc(s[1])) + '</div>'
      : '<div' + a + '>' + mkGlue(esc(t)) + '</div>';
  }
  /* Russian Q3 leaves the booklet's own page number at the end of some
   commentaries — "…– С.510. 37", "…к людям 9". Drop a trailing one-to-three
   digit number, unless it continues a page range ("S. 442. 443"). */
  function dropPageNo(t: unknown) {
    const s = String(t || '');
    /* the number either stands off on a space, or sits glued to the punctuation
     that closes the sentence — "…для нас.14" is a page number just the same */
    const m = s.match(/^([\s\S]*?[.!?…»”"'’)])\s*(\d{1,3})\s*$/) || s.match(/^([\s\S]*?)\s+(\d{1,3})\s*$/);
    if (!m) return s;
    const prev = m[1].match(/(\d{1,4})\s*[.,]?\s*$/);
    if (prev && +m[2] === +prev[1] + 1) return s;
    return m[1];
  }
  function questionLine(sub: Subsection) {
    /* a few Russian entries hold nothing but a page number */
    const parts = (sub.q || [])
      .map((x) => (x.text || '').trim())
      .filter(function (t) {
        return t && !isJunk(t) && !/^\d{1,3}[.;:]?$/.test(t);
      });
    for (const q of sub.question || []) if (q && q.text && !isJunk(q.text)) parts.push(q.text.trim());
    return parts.join(' ');
  }

  let vid = 0; /* runs across a whole quarter, so verse ids stay unique */
  /* Every block of running text carries a key that does not depend on how the
   page happens to be rendered — not on the order of the elements, not on
   whether the Bible text is switched on. A highlight is stored against that
   key, so it comes back after a reload, after the type is enlarged, after the
   verses are turned on. See `mkRestore()`. */
  function renderLesson(les: Lesson, tasks: VerseTask[], lg: string) {
    /* From here down the sheet speaks `rlang`, not the setting: that is the whole
     of what lets a second lesson in another language stand beside the first. */
    rlang = lg || lang;
    /* two full lessons already are two languages — a second edition inside each
     of them would make four columns of nothing legible */
    const par = dualOn() ? '' : paraPick(); /* "" when the second translation is off */
    let h =
      '<div class="lesson">' +
      esc(strip(les.header || '')) +
      '</div>' +
      '<div class="top"><div class="date" data-k="dt">' +
      esc(strip(WORDsab() + ', ' + fmt(les.date, { month: 'long', day: 'numeric', year: 'numeric' }))) +
      '</div></div>';
    h += '<h1 class="title" data-k="ti">' + esc(les.title || '') + '</h1>';

    const kt = les.keyText || {},
      kText = cleanMem(strip(kt.text || les.keyTextVerse || '')),
      kRef = strip((kt.ref && kt.ref.text) || '');
    if (kText)
      h +=
        '<div class="mem" data-k="mem"><b>' +
        esc(MEMLABEL[rlang]) +
        ':</b> ' +
        mkGlue(esc(kText)) +
        (kRef ? ' (' + mkGlue(esc(kRef)) + ').' : '') +
        '</div>';

    const rd = les.reading;
    if (rd && rd.reading && rd.reading.length)
      h +=
        '<div class="read" data-k="rd"><b>' +
        esc(strip(rd.label || '')) +
        '</b> <i>' +
        rd.reading.map((x) => mkGlue(esc(strip(x.label || '')))).join('; ') +
        '</i></div>';

    if (les.keyNote && les.keyNote.text)
      h +=
        '<div class="quote" data-k="qt">' +
        mkGlue(inlineSource(esc(strip(les.keyNote.text)))) +
        sopHtml(les.keyNote.sop, les.keyNote.text) +
        '</div>';

    for (let di = 0; di < (les.dailyLessons || []).length; di++) {
      const day = les.dailyLessons![di];
      const tag = fmt(day.date, { weekday: 'short', month: 'short', day: 'numeric' });
      const st = strip(day.sectionTitle || '').trim();
      const mm = st.match(/^(\d+[.)]?)\s+(.*)$/);
      const secInner = mm
        ? '<span class="n">' + esc(mm[1]) + '</span><span class="ttl">' + esc(mm[2]) + '</span>'
        : '<span class="ttl">' + esc(st) + '</span>';
      const band =
        '<div class="sec" data-d="' +
        esc(day.date) +
        '"><div class="t" data-k="d' +
        di +
        '">' +
        secInner +
        '</div><div class="day">' +
        esc(tag) +
        '</div></div>';
      /* the day is built as a list of blocks first, so that its opening can be
       held together below */
      const subs = day.subsections || [],
        blocks = [];
      for (let si = 0; si < subs.length; si++) {
        const sub = subs[si],
          kk = 'd' + di + 's' + si;
        const q = questionLine(sub);
        if (q) blocks.push(markedHtml('q', q, kk + 'q'));
        if (versesOn) {
          const refs = (sub.q || []).filter((it) => it && it.sOsis);
          if (refs.length) {
            let g = '<div class="vgroup">';
            for (let vi = 0; vi < refs.length; vi++) {
              const it = refs[vi],
                id = 'pv' + vid++;
              /* with a second translation the passage needs a second box to fill;
               its key simply carries a "p", so the marks on the first column
               are the very ones that were there before parallel existed */
              const id2 = par ? id + 'p' : '',
                hid = par ? id + 'h' : '';
              /* the sheet says which edition it quotes: in two languages the two
               sheets quote two different Bibles, and each task carries its own */
              tasks.push([id, it.sOsis as string, id2, hid, BIBLE[rlang]]);
              const ref = strip(it.text || '').replace(/[;,.\s]+$/, '');
              /* Two columns take either shape. Set one verse per line they are
               laid into a single grid and verse n stands opposite verse n; set
               as running text each column is its own paragraph and the two only
               keep their tops together. Both are useful, and which one is asked
               for is the same setting as everywhere else on the page. */
              const cl = versesLines ? ' lines' : '';
              const box = par
                ? '<div class="vpair' +
                  (versesLines ? '' : ' flow') +
                  '">' +
                  '<div class="vtext' +
                  cl +
                  '" id="' +
                  id +
                  '" data-k="' +
                  kk +
                  'v' +
                  vi +
                  '"></div>' +
                  '<div class="vtext' +
                  cl +
                  ' alt" id="' +
                  id2 +
                  '" data-k="' +
                  kk +
                  'v' +
                  vi +
                  'p"></div></div>'
                : '<div class="vtext' + cl + '" id="' + id + '" data-k="' + kk + 'v' + vi + '"></div>';
              /* with two columns the editions name themselves on the reference
               line, each over its own column — a row of labels of their own
               pushed every passage further down the page for nothing */
              const head = par
                ? '<div class="vref pair"><span>' +
                  esc(verShort(BIBLE[rlang])) +
                  (ref ? ' · ' + esc(ref) : '') +
                  '</span>' +
                  '<span id="' +
                  hid +
                  '">' +
                  esc(verShort(par)) +
                  '</span></div>'
                : ref
                  ? '<div class="vref">' + esc(ref) + '</div>'
                  : '';
              g += '<div class="vitem">' + head + box + '</div>';
            }
            blocks.push(g + '</div>');
          }
        }
        let ni = 0;
        for (const n of sub.note || [])
          if (n && n.text && !isJunk(n.text))
            blocks.push(
              '<div class="note" data-k="' +
                kk +
                'n' +
                ni++ +
                '">' +
                mkGlue(inlineSource(esc(dropPageNo(strip(n.text))))) +
                sopHtml(n.sop, n.text) +
                '</div>'
            );
      }
      /* the heading of the day, the question it opens with and the beginning of
       the text that answers it are one block: a day heading left at the foot of
       a page with its Bible text overleaf is what the printed booklet never
       does. `relaxDayStarts()` lets the last piece out again if holding it
       would cost more than a page break is worth. */
      h += '<div class="daystart">' + band + blocks.slice(0, 2).join('') + '</div>' + blocks.slice(2).join('');
      let ri = 0;
      for (const rq of day.reviewQuestions || [])
        if (rq) h += markedHtml('review', dropPageNo(strip(rq)), 'd' + di + 'r' + ri++);
    }
    return h + '<div class="legend"></div>';
  }
  function WORDsab() {
    return ({ de: 'Sabbat', en: 'Sabbath', ru: 'Суббота' } as Dict)[rlang];
  }

  /* the month view reaches into the quarters on either side. Fetch them quietly
   once the lesson is up: opening the calendar is then instant, and the service
   worker keeps them for the next time — including offline. */
  function mkPrefetch() {
    const go = function () {
      neigh(current.getFullYear(), qOf(current))
        .slice(1)
        .forEach(function (p) {
          loadQuarter(lang, p[0], p[1]);
        });
    };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2500 });
    else setTimeout(go, 1200);
  }
  let token = 0;
  let scope = 'week'; /* "week" | "quarter" */
  /* the sheet carries which lesson it holds: pencil marks are stored per lesson
   and per language, and a quarter puts thirteen sheets on the page at once */
  /* The sheet carries the language it was set in, not the language of the setting.
   `mkKey` reads it from here, so the marks of the right-hand lesson file
   themselves under their own key without the pencil knowing two sheets exist. */
  function sheet(inner: string, id?: string, lg?: string) {
    return (
      '<div class="page"' +
      (id ? ' data-les="' + id + '" data-lang="' + (lg || lang) + '"' : '') +
      '>' +
      inner +
      '</div>'
    );
  }
  /* what the browser will call the saved file — set as the page is built */
  let docName = 'SBL Edition';
  function fileSafe(s: unknown) {
    return String(s || '')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* An A4 page holds about 1010 px of text. Keeping the opening of a day
   together is worth a page break; keeping half a page of commentary together
   is not — past that the last piece is let out of the block again. */
  const KEEPMAX = 420;
  function relaxDayStarts() {
    document.querySelectorAll<HTMLElement>('.daystart').forEach(function (d) {
      while (d.children.length > 2 && d.offsetHeight > KEEPMAX)
        d.parentNode!.insertBefore(d.lastElementChild!, d.nextSibling);
    });
  }

  async function render() {
    const my = ++token;
    mkKeepY = window.scrollY; /* where the reader was, in case the lesson stays */
    /* the whole sheet is set justified with hyphens:auto, and the browser picks
     its hyphenation dictionary by the language of the document: without this
     line German breaks by English rules and Russian never breaks at all, which
     tears rivers of white through every justified paragraph in the PDF */
    document.documentElement.lang = lang;
    paintCredit(lang);
    buildSeg();
    const sheets = byId('sheets'),
      wk = byId('wk');
    sheets.innerHTML = sheet('<div class="msg">&hellip;</div>');
    const tasks: VerseTask[] = [];
    vid = 0;

    /* One language, or two side by side. `sideHtml` builds one whole side in the
     language it is handed, so the second side is the first one over again with
     a different argument — no branch of its own anywhere below. */
    const dual = dualOn(),
      other = dual ? dualOther() : '';
    async function sideHtml(lg: string) {
      if (scope === 'quarter') {
        const data = await loadQuarter(lg, current.getFullYear(), qOf(current));
        const lessons = (data && data.lessons) || [];
        if (!lessons.length)
          return { html: sheet('<div class="msg">No lessons for this quarter.</div>'), title: '', name: '' };
        return {
          html: lessons
            .map(function (les: Lesson) {
              return sheet(renderLesson(les, tasks, lg), les.date, lg);
            })
            .join(''),
          title: strip(data.title || ''),
          name: fileSafe('SBL ' + current.getFullYear() + '-Q' + qOf(current) + ' ' + strip(data.title || '')),
        };
      }
      const les = await findLesson(current, lg);
      if (!les) return { html: sheet('<div class="msg">No lesson for this week.</div>'), title: '', name: '' };
      return {
        html: sheet(renderLesson(les, tasks, lg), les.date, lg),
        title: strip(les.header || ''),
        name: fileSafe(
          'SBL ' +
            String(les.date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') +
            ' ' +
            strip(les.header || '') +
            ' ' +
            strip(les.title || '')
        ),
      };
    }

    const sides = await Promise.all([sideHtml(lang)].concat(dual ? [sideHtml(other)] : []));
    if (my !== token) return;
    rlang = lang; /* the page is itself again outside a sheet */
    if (!sides[0].title && !sides[0].name) {
      sheets.className = '';
      sheets.innerHTML = sides[0].html;
      wk.innerHTML = '';
      mkDaysBuild();
      mkLastLes = null;
      window.scrollTo(0, 0);
      return;
    }
    /* the lesson number alone — the date is on the sheet and in the calendar */
    wk.innerHTML = '<b>' + esc(sides[0].title) + '</b>';
    docName = sides[0].name;
    sheets.className = dual ? 'dual' : '';
    document.body.classList.toggle('dualview', dual);
    sheets.innerHTML = dual
      ? sides
          .map(function (s, i) {
            return '<div class="pane" data-lg="' + (i ? other : lang) + '">' + s.html + '</div>';
          })
          .join('')
      : sides[0].html;

    relaxDayStarts();
    mkRestore();
    mkPanesListen(); /* the columns are new — so are their scrollbars */
    mkDaysBuild();
    mkOpenToday();
    mkPrefetch();

    if (versesOn && tasks.length) {
      /* Every edition the page needs at once — the second must not make the first
       one wait, and the service worker keeps each of them for next time. With
       two lessons on screen that is two Bibles, and each task says which one is
       its own. */
      const par = dual ? '' : paraPick();
      const pl = par ? String(par).split('-')[0] : '';
      const want: string[] = [];
      for (const t of tasks) if (t[4] && want.indexOf(t[4]) < 0) want.push(t[4]);
      if (par && want.indexOf(par) < 0) want.push(par);
      const got: (BibleEdition | Dict | null)[] = await Promise.all([
        ...want.map(loadBible),
        /* the names of the books in the second edition's language, if the page
         has a lesson in it at all — fetched beside the editions, never after */
        pl && pl !== lang && LANGS.indexOf(pl) >= 0 ? paraRefMap(pl, current.getFullYear(), qOf(current)) : null,
      ]);
      if (my !== token) return;
      const bibs: Record<string, BibleEdition | null> = {};
      want.forEach(function (v: string, i: number) {
        bibs[v] = got[i] as BibleEdition | null;
      });
      const refs2 = got[want.length] as Dict | null;
      for (const t of tasks) {
        const el = byId(t[0]);
        if (!el) continue;
        const bib = bibs[t[4]];
        if (t[2]) {
          const el2 = byId(t[2]),
            bib2 = bibs[par];
          const p = versePair(bib && bib.books, bib2 && bib2.books, t[1], versesLines);
          el.innerHTML = p[0] || '<span class="vmiss">—</span>';
          if (el2) el2.innerHTML = p[1] || '<span class="vmiss">—</span>';
          const hd = t[3] && byId(t[3]),
            r2 = refs2 && refs2[t[1]];
          if (hd && r2) hd.textContent = verShort(par) + ' · ' + r2;
          continue;
        }
        const vh = verseHtml(bib && bib.books, t[1], versesLines);
        el.innerHTML = vh || '<span class="vmiss">—</span>';
      }
      relaxDayStarts(); /* the passage has arrived — the block may have outgrown its keep */
      mkRestore(); /* … and the marks that live inside the passage can go back on */
    }
  }
  /* three languages fit on one button: it shows the one you are reading and
   steps to the next when pressed */
  function buildSeg() {
    const el = byId('langseg');
    el.innerHTML = LANGS.map(
      (x) => '<div class="o' + (x === lang ? ' active' : '') + '" data-l="' + x + '">' + x.toUpperCase() + '</div>'
    ).join('');
    el.querySelectorAll<HTMLElement>('.o').forEach(
      (o) =>
        (o.onclick = () => {
          if (o.dataset.l === lang) return;
          lang = o.dataset.l as string;
          localStorage.setItem('sbl.lang', lang);
          render();
        })
    );
    paintUI();
  }
  /* ‹ › step by week, or by quarter when the whole quarter is on screen */
  function step(dir: number) {
    if (scope === 'quarter') {
      const d = new Date(current.getTime());
      d.setMonth(d.getMonth() + dir * 3, 15);
      return d;
    }
    return addDays(current, dir * 7);
  }
  /* text size — the whole sheet grows, so every proportion of the booklet holds.
   Three steps, 130% being as far as a phone line can usefully stretch. */
  const ZOOMS = [1, 1.15, 1.3];
  let zi = +(localStorage.getItem('sbl.zoom') || 0);
  if (!(zi === 1 || zi === 2)) zi = 0;
  const zout = byId('zoomout'),
    zin = byId('zoomin');
  function paintZoom() {
    if (zi > maxStep()) zi = maxStep();
    document.documentElement.style.setProperty('--z', String(ZOOMS[zi]));
    zout.classList.toggle('off', zi === 0);
    zin.classList.toggle('off', zi >= maxStep());
    const pct = Math.round(ZOOMS[zi] * 100) + '%';
    zout.title = 'Smaller text — now ' + pct;
    zin.title = 'Larger text — now ' + pct;
  }
  /* a 320px screen has no room for the booklet's tag and date side by side at
   the largest step, so the top step is only offered where it fits */
  function maxStep() {
    return window.innerWidth < 400 ? 1 : ZOOMS.length - 1;
  }
  /* ——— growing the type must not lose the line ———
   The sheet scales as a whole, so every line above the reader grows too and the
   place he was at slides out from under him — the further into the lesson, the
   further it goes. The pixel he was on is worthless; the line he was reading is
   not. So the block at the top of the screen is noted down together with where
   on the screen it stood, and afterwards the page is moved until it stands
   there again. */
  function zoomAnchor() {
    const pane = mkPanes()[0] || null;
    const line = (pane ? pane.getBoundingClientRect().top : 0) + mkBarH();
    const blocks = (pane || document).querySelectorAll<HTMLElement>('#sheets [data-k]');
    for (const b of blocks) {
      const r = b.getBoundingClientRect();
      if (r.bottom > line) return { el: b, at: r.top };
    }
    return null;
  }
  function zoomRestore(a: { el: HTMLElement; at: number } | null) {
    if (!a || !a.el.isConnected) return;
    const d = a.el.getBoundingClientRect().top - a.at;
    if (Math.abs(d) < 1) return;
    const pane = a.el.closest('#sheets.dual .pane');
    if (pane) pane.scrollTop += d;
    else window.scrollBy(0, d);
  }
  function setZoom(d: number) {
    const n = Math.min(maxStep(), Math.max(0, zi + d));
    if (n === zi) return;
    const a = zoomAnchor();
    zi = n;
    localStorage.setItem('sbl.zoom', String(zi));
    paintZoom();
    /* At once, so that a second press lands on a page already put right — two
     quick presses used to take their bearings from a page still moving. Then
     again on the next frames, for the reflow further down the sheet. */
    zoomRestore(a);
    requestAnimationFrame(function () {
      zoomRestore(a);
      requestAnimationFrame(function () {
        zoomRestore(a);
      });
    });
  }
  paintZoom();
  zout.onclick = function () {
    setZoom(-1);
  };
  zin.onclick = function () {
    setZoom(1);
  };

  /* week stepping lives in the calendar now; the keyboard still walks the weeks */
  document.addEventListener('keydown', function (e) {
    /* while the reader is writing, the arrows walk the words — not the weeks */
    const t = asElem(e.target),
      a = document.activeElement as HTMLElement | null,
      F = /^(INPUT|TEXTAREA|SELECT)$/;
    if (t && (t.isContentEditable || F.test(t.tagName))) return;
    if (a && (a.isContentEditable || F.test(a.tagName))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft') {
      current = step(-1);
      render();
    }
    if (e.key === 'ArrowRight') {
      current = step(1);
      render();
    }
  });
  /* the month, with every week carrying the lesson that ends on its Sabbath */
  const calpop = byId('calpop');
  let calMonth: Date | null = null;
  async function buildCal() {
    const y = calMonth!.getFullYear(),
      m = calMonth!.getMonth();
    const byDate: Record<string, Lesson> = {};
    for (const [yy, qq] of neigh(y, Math.floor(m / 3) + 1)) {
      const d = await loadQuarter(lang, yy, qq);
      if (d && d.lessons) for (const l of d.lessons) byDate[l.date] = l;
    }
    const first = new Date(y, m, 1);
    const cur = new Date(first.getTime());
    cur.setDate(1 - first.getDay()); /* back to Sunday */
    const today = new Date(),
      tKey = ymd(today),
      cKey = ymd(current);
    const dayNames = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 1, 1 + i);
      dayNames.push(esc(new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short' }).format(d)).slice(0, 2));
    }

    let h =
      '<div class="calhead"><span class="calnav" data-m="-1">&lsaquo;</span><b>' +
      esc(new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', year: 'numeric' }).format(first)) +
      '</b><span class="calnav" data-m="1">&rsaquo;</span></div>' +
      '<div class="calrow head"><div class="dcells">' +
      dayNames.map((n) => '<div class="d">' + n + '</div>').join('') +
      '</div><div class="les"></div></div>';

    for (let w = 0; w < 6; w++) {
      const sat = new Date(cur.getTime());
      sat.setDate(cur.getDate() + 6);
      if (w > 0 && cur.getMonth() !== m && sat.getMonth() !== m) break;
      const les = byDate[ymd(sat)];
      let days = '',
        inWeek = false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(cur.getTime());
        d.setDate(cur.getDate() + i);
        const k = ymd(d);
        if (k === cKey) inWeek = true;
        days +=
          '<div class="d' +
          (d.getMonth() !== m ? ' out' : '') +
          (k === tKey ? ' today' : '') +
          '" data-d="' +
          k +
          '">' +
          d.getDate() +
          '</div>';
      }
      h +=
        '<div class="calrow' +
        (les ? ' pick' : '') +
        (inWeek && les ? ' on' : '') +
        '"' +
        (les ? ' data-d="' + les.date + '"' : '') +
        '>' +
        '<div class="dcells">' +
        days +
        '</div><div class="les">' +
        (les ? '<b>' + esc(strip(les.header || '')) + '</b><span>' + esc(strip(les.title || '')) + '</span>' : '') +
        '</div></div>';
      cur.setDate(cur.getDate() + 7);
    }
    h += '<div class="calfoot"><div class="it" data-today="1">' + esc(WORDtoday()) + '</div></div>';
    calpop.innerHTML = h;

    calpop.querySelectorAll<HTMLElement>('.calnav').forEach(function (n) {
      n.onclick = function (e) {
        e.stopPropagation();
        calMonth!.setMonth(calMonth!.getMonth() + +n.dataset.m!, 1);
        buildCal();
      };
    });
    calpop.querySelectorAll<HTMLElement>('[data-d]').forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        calpop.hidden = true;
        current = ymdToDate(el.dataset.d as string);
        render();
      };
    });
    calpop.querySelector<HTMLElement>('[data-today]')!.onclick = function () {
      calpop.hidden = true;
      current = new Date();
      render();
    };
  }
  function WORDtoday() {
    return ({ de: 'Diese Woche', en: 'This week', ru: 'Эта неделя' } as Dict)[lang];
  }
  byId('wk').onclick = function (e) {
    e.stopPropagation();
    setpop.hidden = true;
    gear.classList.remove('open');
    if (calpop.hidden) {
      calMonth = new Date(current.getFullYear(), current.getMonth(), 1);
      buildCal();
      calpop.hidden = false;
    } else calpop.hidden = true;
  };

  const tog = byId('tog'),
    vlines = byId('vlines');
  /* the icon shows the layout you are in: solid block of text, or a numbered list */
  const ICON_FLOW =
    '<svg width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 1.6h13M1 6h13M1 10.4h8.5"/></svg>';
  const ICON_LIST =
    '<svg width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="1.5" cy="1.6" r=".9" fill="currentColor" stroke="none"/><path d="M5 1.6h9"/><circle cx="1.5" cy="6" r=".9" fill="currentColor" stroke="none"/><path d="M5 6h9"/><circle cx="1.5" cy="10.4" r=".9" fill="currentColor" stroke="none"/><path d="M5 10.4h6"/></svg>';
  /* Running text and one verse per line are two answers to one question, so the
   two buttons are exclusive: exactly one of them is lit while the Bible text is
   shown, and pressing the lit one puts the text away altogether. The parallel
   button asks a different question and stands apart — it may be lit with either
   of them, and both shapes work in two columns. */
  /* The icons are put in once and never touched again. Rewritten on every repaint
   they destroyed the very node that had just been clicked, and the handler that
   closes the settings when you press outside them saw a target no longer in the
   page and closed the sheet under the hand — one press of a layout button and
   the settings were gone. */
  tog.innerHTML = ICON_FLOW;
  vlines.innerHTML = ICON_LIST;
  function paintVerseBtns() {
    tog.classList.toggle('active', versesOn && !versesLines);
    vlines.classList.toggle('active', versesOn && versesLines);
    tog.title = UI.flow[lang];
    vlines.title = UI.perline[lang];
  }
  /* One press picks a layout and shows the text in it; pressing the layout that
   is already lit puts the text away. The columns are not touched either way —
   they take both shapes. */
  function mkVerseLayout(lines: boolean) {
    if (versesOn && versesLines === lines) versesOn = false; /* the lit one put out */
    else {
      versesOn = true;
      versesLines = lines;
    }
    localStorage.setItem('sbl.verses', versesOn ? '1' : '0');
    localStorage.setItem('sbl.verselines', versesLines ? '1' : '0');
    paintVerseBtns();
    paintPara();
    render();
  }
  tog.onclick = function () {
    mkVerseLayout(false);
  };
  vlines.onclick = function () {
    mkVerseLayout(true);
  };
  /* Parallel reading — the switch and the list of second translations. The list
   never offers the edition the lesson is already set in, and it is rebuilt on
   every language change, because what counts as "the other one" changes with
   it. */
  const paraTog = byId('paratog'),
    paraSel = byId<HTMLSelectElement>('para-sel');
  function paraDefault() {
    return BIBLE[lang] === 'en-kjv' ? 'de-lut' : 'en-kjv';
  }
  function paintPara() {
    const fits = paraFits();
    /* the three buttons in that row all answer one question — how the Bible text
     is shown — so the second translation stands with them instead of taking a
     row of its own. It keeps its setting while it is away: narrowing the window
     hides the button, widening it again brings the columns back as they were. */
    /* Two whole lessons already occupy the second column, so the button is not
     shown at all there — a control that cannot act must not sit lit. Its
     setting is kept: leaving the two-language view brings it back as it was. */
    paraTog.hidden = !fits || dualOn();
    /* with no Bible text on the sheet there is nothing to set beside anything, so
     the button is unlit — its setting is kept, it simply has nothing to do */
    paraTog.classList.toggle('active', paraOn && fits && versesOn && !dualOn());
    /* The list is never away: it names the edition for both shapes at once — the
     column when the column is on, and the verse held under a finger when it is
     not. Hiding it with the columns would leave the hold with no way to say
     which translation it should bring. It only changes how it stands: pressed
     to the button while the columns are on, on its own line with its own label
     the rest of the time. */
    const prow = byId('para-row');
    prow.hidden = false;
    prow.classList.toggle('solo', !(fits && paraOn && !dualOn()));
    if (paraVer === BIBLE[lang] || !PARA.some((p) => p[1] === paraVer)) {
      paraVer = paraDefault();
      localStorage.setItem('sbl.paraver', paraVer);
    }
    paraSel.innerHTML = PARA.filter((p) => p[1] !== BIBLE[lang])
      .map(
        (p) =>
          '<option value="' +
          p[1] +
          '"' +
          (p[1] === paraVer ? ' selected' : '') +
          '>' +
          esc(p[0] + ' · ' + p[2]) +
          '</option>'
      )
      .join('');
  }
  paraTog.onclick = function () {
    paraOn = !paraOn;
    /* a second Bible text with no first one makes no sense — the same courtesy
     the layout button does above */
    if (paraOn && !versesOn) {
      versesOn = true;
      localStorage.setItem('sbl.verses', '1');
    }
    localStorage.setItem('sbl.para', paraOn ? '1' : '0');
    /* the columns and the layout are separate questions, but both buttons must
     show the truth after either of them moves */
    paintPara();
    paintVerseBtns();
    render();
  };
  /* ——— the lesson twice ——— */
  const dualSw = byId('dual-sw'),
    dualSeg = byId('dualseg');
  function paintDual() {
    const fits = dualFits();
    byId('dual-row').hidden = !fits;
    dualSw.classList.toggle('on', dualOn_ && fits);
    byId('dual-lang-row').hidden = !fits || !dualOn_;
    const other = dualOther();
    if (dualLang !== other) {
      dualLang = other;
      localStorage.setItem('sbl.duallang', dualLang);
    }
    /* the language the lesson is already in is not on offer: a sheet cannot stand
     beside itself */
    dualSeg.innerHTML = LANGS.filter(function (l) {
      return l !== lang;
    })
      .map(function (l) {
        return (
          '<div class="o' + (l === dualLang ? ' active' : '') + '" data-l="' + l + '">' + l.toUpperCase() + '</div>'
        );
      })
      .join('');
    dualSeg.querySelectorAll<HTMLElement>('.o').forEach(function (o) {
      o.onclick = function () {
        if (o.dataset.l === dualLang) return;
        dualLang = o.dataset.l as string;
        localStorage.setItem('sbl.duallang', dualLang);
        paintDual();
        render();
      };
    });
  }
  dualSw.onclick = function () {
    dualOn_ = !dualOn_;
    localStorage.setItem('sbl.dual', dualOn_ ? '1' : '0');
    /* two lessons and a second edition inside each of them would be four columns
     of nothing legible — the wider setting wins */
    if (dualOn_ && paraOn) {
      paraOn = false;
      localStorage.setItem('sbl.para', '0');
    }
    paintDual();
    paintPara();
    paintVerseBtns();
    render();
  };
  DUAL_MQ.addEventListener('change', function () {
    paintDual();
    paintPara();
    render();
  });

  paraSel.onchange = function () {
    paraVer = paraSel.value;
    localStorage.setItem('sbl.paraver', paraVer);
    /* picking a second Bible text with no first one on screen leaves the reader
     with a setting and nothing to hold — the same courtesy the switch does */
    let redraw = !!paraPick();
    if (!versesOn) {
      versesOn = true;
      localStorage.setItem('sbl.verses', '1');
      paintVerseBtns();
      redraw = true;
    }

    /* otherwise only the column has to be set again: a held verse is fetched at
     the moment it is held, so a phone is not made to redraw the lesson */
    if (redraw) render();
  };
  /* Turning the tablet is the one gesture that adds or takes away the room for a
   second column, so it is the one gesture that has to redraw the sheet. Only
   when the parallel is actually on — otherwise a rotation costs nothing. */
  PARA_MQ.addEventListener('change', function () {
    paintPara();
    if (paraOn) render();
  });

  /* ——— the second translation under a held verse ———
   Where the pair has no room the other edition is still one gesture away: press
   a verse and hold, and it comes out under it in the translation picked above;
   let go and it folds. Two things it never argues with — a tool in hand marks
   the verse instead (that is what taking a tool means), and where the parallel
   column is actually on screen the card stays down, because the answer is
   already standing beside the verse. */
  const vpeek = byId('vpeek');
  let peekTok = 0,
    peekT: ReturnType<typeof setTimeout> | undefined;
  function peekRect(el: Element) {
    return el.getClientRects()[0] || el.getBoundingClientRect();
  }
  function peekPlace(el: HTMLElement) {
    const r = peekRect(el),
      w = vpeek.offsetWidth,
      h = vpeek.offsetHeight;
    /* placed in what is on screen, with no scroll position added: that addition
     is what threw the marker bubble a browser bar's worth off on iOS */
    const x = Math.max(10, Math.min(r.left + r.width / 2 - w / 2, document.documentElement.clientWidth - w - 10));
    let y = r.bottom + 8;
    if (y + h + 10 > window.innerHeight) y = r.top - h - 8;
    /* and whatever the arithmetic above decided, inside the window: a verse can
     be off the top of the screen by the time the edition lands, and a card
     placed against it would be off the screen with it */
    y = Math.max(10, Math.min(y, window.innerHeight - h - 10));
    vpeek.style.left = Math.round(x) + 'px';
    vpeek.style.top = Math.round(y) + 'px';
  }
  function peekClose() {
    clearTimeout(peekT);
    peekTok++;
    if (!vpeek.classList.contains('on')) return;
    vpeek.classList.remove('in');
    const mine = peekTok;
    setTimeout(function () {
      if (mine === peekTok) vpeek.classList.remove('on');
    }, 220);
  }
  async function peekOpen(el: HTMLElement) {
    const a = String(el.dataset.vr || '').split('.'),
      ver = paraVer;
    if (a.length !== 3 || !ver) return;
    const my = ++peekTok,
      n = +a[2];
    /* the card stands up at once, named and empty: the first hold of a session
     may have a whole edition still to fetch */
    vpeek.innerHTML =
      '<div class="pv">' +
      esc((ver.split('-')[1] || ver).toUpperCase()) +
      '</div>' +
      '<div class="pt"><span class="pn">' +
      n +
      '</span><span class="pb">&hellip;</span></div>';
    vpeek.classList.add('on');
    peekPlace(el);
    requestAnimationFrame(function () {
      if (my === peekTok) vpeek.classList.add('in');
    });
    const bib = await loadBible(ver);
    if (my !== peekTok) return; /* let go while the edition was still in the air */
    const ch = bib && bib.books && bib.books[a[0]],
      vs = ch && ch[+a[1] - 1];
    const t = vs && vs[n - 1] != null ? esc(strip(String(vs[n - 1])).trim()) : '';
    vpeek.querySelector<HTMLElement>('.pb')!.innerHTML = t || '<span class="vmiss">&mdash;</span>';
    peekPlace(el); /* the verse arrived and the card grew */
  }
  /* Once it is up it stays up. Letting go of the verse used to fold it, which
   meant reading a whole verse with a finger held still on the glass — and on a
   phone the finger was standing on the very text being compared. It closes
   when it is dismissed: a tap anywhere, a scroll, or Escape. */
  let peekAt = 0;
  function peekDismiss() {
    if (!vpeek.classList.contains('on')) return;
    /* a stray scroll event in the same breath as the opening must not take it
     straight back down again */
    if (Date.now() - peekAt < 400) return;
    peekClose();
  }
  document.addEventListener('pointerdown', peekDismiss, true); /* before anything opens a new one */
  window.addEventListener('scroll', peekDismiss, { passive: true });
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Escape') peekDismiss();
    },
    true
  );

  byId('sheets').addEventListener('pointerdown', function (e) {
    if (mkMode) return; /* something in hand: it marks, it does not ask */
    if (paraPick()) return; /* the column beside the verse already answers */
    const el = (e.target as HTMLElement).closest && (e.target as HTMLElement).closest('[data-vr]');
    if (!el) return;
    const x0 = e.clientX,
      y0 = e.clientY;
    let held = false;
    clearTimeout(peekT);
    peekT = setTimeout(function () {
      held = true;
      peekAt = Date.now();
      peekOpen(el as HTMLElement);
    }, 340);
    const off = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', off);
      document.removeEventListener('pointercancel', off);
      /* the card was never opened — this was a tap, or a finger that travelled */
      if (!held) peekClose();
    };
    /* a pointer that travels is turning the page or dragging a selection, and
     neither of those asked for a translation */
    const move = function (ev: PointerEvent) {
      if (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8) {
        clearTimeout(peekT);
        off();
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', off);
    document.addEventListener('pointercancel', off);
  });
  /* PDF: pick the week or the whole quarter — the choice also switches what the
   page shows, so you can check it before saving */

  const PDFWORD: Record<string, string[]> = {
    de: ['Woche', 'Quartal'],
    en: ['Week', 'Quarter'],
    ru: ['Неделя', 'Квартал'],
  };
  /* every word in the settings sheet, in the language being read */
  const UI: Phrase = {
    settings: { de: 'Einstellungen', en: 'Settings', ru: 'Настройки' },
    lesson: { de: 'Lektion wählen', en: 'Pick a lesson', ru: 'Выбрать урок' },
    lang: { de: 'Sprache', en: 'Language', ru: 'Язык' },
    verses: { de: 'Bibeltext', en: 'Bible text', ru: 'Текст Библии' },
    size: { de: 'Schriftgröße', en: 'Text size', ru: 'Размер текста' },
    colour: { de: 'Farbe', en: 'Colour', ru: 'Цвет' },
    pdf: { de: 'Als PDF sichern', en: 'Save as PDF', ru: 'Сохранить в PDF' },
    show: { de: 'Bibeltext anzeigen', en: 'Show the Bible text', ru: 'Показывать текст Библии' },
    perline: { de: 'Ein Vers pro Zeile', en: 'One verse per line', ru: 'Каждый стих строкой' },
    flow: { de: 'Fließtext', en: 'Running text', ru: 'Сплошным текстом' },
    para: { de: 'Parallel', en: 'Parallel', ru: 'Параллельно' },
    parahint: { de: 'Zweite Übersetzung daneben', en: 'A second translation alongside', ru: 'Второй перевод рядом' },
    second: { de: 'Zweite Übersetzung', en: 'Second translation', ru: 'Второй перевод' },
    secondhint: {
      de: 'Kommt unter dem gehaltenen Vers heraus',
      en: 'Comes out under a held verse',
      ru: 'Выходит под удержанным стихом',
    },
    dual: { de: 'Zwei Sprachen', en: 'Two languages', ru: 'Два языка' },
    dualhint: {
      de: 'Die ganze Lektion zweimal, nebeneinander',
      en: 'The whole lesson twice, side by side',
      ru: 'Весь урок дважды, рядом',
    },
    duallang: { de: 'Zweite Sprache', en: 'Second language', ru: 'Второй язык' },
    paper: { de: 'Papier', en: 'Paper', ru: 'Бумага' },
    paperhint: {
      de: 'Feine Papierstruktur unter dem Text — nicht im Druck',
      en: 'A faint paper grain under the text — never in print',
      ru: 'Лёгкая структура бумаги под текстом — в печать не идёт',
    },
    paperoff: { de: 'Aus', en: 'Off', ru: 'Нет' },
    papergrain: { de: 'Korn', en: 'Grain', ru: 'Зерно' },
    paperdust: { de: 'Staub', en: 'Dust', ru: 'Пыль' },
  };
  function paintUI() {
    byId('lab-lang').textContent = UI.lang[lang];
    byId('lab-verses').textContent = UI.verses[lang];
    byId('paratog').title = UI.para[lang] + ' — ' + UI.parahint[lang];
    byId('lab-second').textContent = UI.second[lang];
    byId('lab-second').title = UI.secondhint[lang];
    /* "the other translation" is not the same one in every language, and the row
     of layouts speaks the language of the lesson too */
    paintPara();
    paintVerseBtns();
    byId('lab-dual').textContent = UI.dual[lang];
    byId('lab-dual').title = UI.dualhint[lang];
    byId('lab-duallang').textContent = UI.duallang[lang];
    paintDual(); /* "the other language" changes with the language of the lesson */
    byId('lab-size').textContent = UI.size[lang];
    byId('lab-colour').textContent = UI.colour[lang];
    byId('lab-paper').textContent = UI.paper[lang];
    byId('lab-paper').title = UI.paperhint[lang];
    paintPaperSel();
    byId('lab-pdf').textContent = UI.pdf[lang];
    byId('gear').title = UI.settings[lang];
    byId('wk').title = UI.lesson[lang];
    const w = PDFWORD[lang] || PDFWORD.en;
    byId('pdf-week').textContent = w[0];
    byId('pdf-quarter').textContent = w[1];
    /* the pencil speaks the language of the lesson too */
    byId('lab-mark').textContent = T('marking');
    byId('lab-mark').title = T('kept');
    byId('mk-keys').textContent = T('keys');
    byId('mk-ver').textContent =
      APP_VERSION + ' · ' + (({ de: 'Was ist neu', en: "What's new", ru: 'Что нового' } as Dict)[lang] || "What's new");
    byId('mk-rail').classList.toggle('on', mkRailOn);
    mkPaintMode();
    mkChipPaint();
  }

  /* what to put back once the print dialog is gone */
  let backScope: string | null = null,
    backTitle: string | null = null,
    backDual: boolean | null = null,
    printQueue: string | null = null,
    printGuard: ReturnType<typeof setTimeout> | undefined;
  /* Escape while a print dialog is up means "no more of this": the second
   language is taken off the queue instead of arriving unasked. */
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Escape') printQueue = null;
    },
    true
  );
  window.addEventListener('afterprint', function () {
    clearTimeout(printGuard);
    if (backTitle != null) {
      document.title = backTitle;
      backTitle = null;
    }
    /* a queued second language: the same booklet again, in the other tongue */
    if (printQueue) {
      const q = printQueue;
      printQueue = null;
      setTimeout(function () {
        printSide(q);
      }, 60);
      return;
    }
    if (backDual != null) {
      const d = backDual;
      backDual = null;
      if (d !== dualOn_) {
        dualOn_ = d;
        paintDual();
      }
    }
    /* saving a PDF is not a way of navigating: whoever was reading one lesson
     gets that lesson back, not the thirteen of the quarter */
    if (backScope != null || backDual === null) {
      const s = backScope;
      backScope = null;
      if (s != null && s !== scope) scope = s;
      render();
    }
  });
  /* One side, printed as the ordinary single-language booklet it is. A browser
   gives one document per `print()`, so two languages are two prints one after
   the other — which is exactly what was asked for: each translation arrives as
   its own file, as though it had been saved on its own. */
  async function printSide(lg: string) {
    const back = lang;
    lang = lg;
    document.documentElement.lang = lang;
    paintCredit(lang);
    try {
      await render();
    } catch {
      /* nothing to do: the page carries on without it */
    }
    try {
      await document.fonts.ready;
    } catch {
      /* nothing to do: the page carries on without it */
    }
    await new Promise(function (r) {
      requestAnimationFrame(function () {
        requestAnimationFrame(r);
      });
    });
    /* the browser names the file after the title — so it says which lesson it is */
    backTitle = document.title;
    document.title = docName;
    lang = back; /* the setting was never really changed */
    /* Some browsers never send `afterprint`. Without a way back the page would be
     left in its printing state — one language, the scope of the file — until a
     reload. This puts it back if nothing has been heard for a while. */
    clearTimeout(printGuard);
    printGuard = setTimeout(function () {
      window.dispatchEvent(new Event('afterprint'));
    }, 20000);
    window.print();
  }
  async function savePdf(which: string) {
    setpop.hidden = true;
    byId('gear').classList.remove('open');
    const b = byId('pdf-' + which),
      o = b.textContent;
    b.textContent = '…';
    backScope = scope;
    scope = which;
    /* the setting itself, not the setting plus the width of the window: each side
     prints as an ordinary one-column booklet, and a narrow screen is no reason
     to drop a language out of the file without saying so */
    const dual = dualOn_ && dualOther();
    if (dual) {
      /* the booklet prints as a booklet: one language to a sheet. The two columns
       are a way of reading, not a way of printing. */
      backDual = dualOn_;
      dualOn_ = false;
      printQueue = dualOther();
      b.textContent = o;
      await printSide(lang);
      return;
    }
    try {
      await render();
    } catch {
      /* nothing to do: the page carries on without it */
    }
    b.textContent = o;
    /* print only once the type is really on the page: the fallback faces carry
     other metrics and would break the lesson onto different sheets */
    try {
      await document.fonts.ready;
    } catch {
      /* nothing to do: the page carries on without it */
    }
    await new Promise(function (r) {
      requestAnimationFrame(function () {
        requestAnimationFrame(r);
      });
    });
    backTitle = document.title;
    document.title = docName;
    window.print();
  }
  byId('pdf-week').onclick = function () {
    savePdf('week');
  };
  byId('pdf-quarter').onclick = function () {
    savePdf('quarter');
  };

  // colour-the-bands popover
  const tpop = byId('tintpop');
  function buildPop() {
    let html = '';
    THEMES.forEach(function (t, i) {
      html +=
        '<span class="sw" data-i="' +
        i +
        '" title="' +
        ['Grey', 'Cover', 'Paper', 'Forest', 'Gold'][i] +
        '" style="background:' +
        t.dk +
        '"></span>';
    });
    html += '<span class="sw custom" id="swcustom"></span>';
    tpop.innerHTML = html;
    tpop.querySelectorAll<HTMLElement>('.sw[data-i]').forEach(function (s) {
      s.onclick = function () {
        const i = +s.dataset.i!;
        setTint(THEMES[i]);
        localStorage.setItem('sbl.tint', JSON.stringify({ i: i }));
        hueActive = false;
        hueRow.hidden = true;
        paintHue();
      };
    });
    /* the wheel opens the strip in the panel itself: one row appears under the
     swatches, and it is the only thing there is to move */
    byId('swcustom').onclick = function () {
      hueRow.hidden = !hueRow.hidden;
      if (!hueRow.hidden) paintHue();
    };
  }
  const hueRow = byId('hue-row'),
    hueBar = byId('huebar');
  /* the dot sits where the hue is, and the wheel wears the colour it stands for
   as soon as one is taken — so the row of swatches always shows what is on */
  function paintHue() {
    (hueBar.firstElementChild as HTMLElement).style.left = (hueOwn / 360) * 100 + '%';
    const sc = byId('swcustom');
    if (sc) sc.style.background = hueActive ? hueTint(hueOwn).dk : '';
  }
  function takeHue(e: PointerEvent) {
    const r = hueBar.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
    hueOwn = Math.round((x / r.width) * 360) % 360;
    hueActive = true;
    setTint(hueTint(hueOwn));
    paintHue();
    localStorage.setItem('sbl.tint', JSON.stringify({ h: hueOwn }));
  }
  /* one gesture, mouse or finger: the bands follow the dot while it is dragged,
   so the choice is made by looking at the lesson, not at a preview */
  hueBar.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    hueBar.setPointerCapture(e.pointerId);
    takeHue(e);
  });
  hueBar.addEventListener('pointermove', function (e) {
    if (hueBar.hasPointerCapture(e.pointerId)) takeHue(e);
  });
  buildPop();
  paintHue();
  /* one panel at a time; a click anywhere else closes them */
  const setpop = byId('setpop'),
    gear = byId('gear');
  gear.onclick = function (e) {
    e.stopPropagation();
    calpop.hidden = true;
    setpop.hidden = !setpop.hidden;
    gear.classList.toggle('open', !setpop.hidden);
  };
  document.addEventListener('click', function (e) {
    if (!setpop.hidden && !setpop.contains(e.target as Node) && !gear.contains(e.target as Node)) {
      setpop.hidden = true;
      gear.classList.remove('open');
    }
    if (!calpop.hidden && !calpop.contains(e.target as Node) && (e.target as HTMLElement).id !== 'wk')
      calpop.hidden = true;
  });

  /* ==========================================================================
   PENCIL — highlights, own notes, own insertions.
   Three rules hold the whole thing together:
   · everything is drawn as the background of the line, so it flows with the
     text and lands in the PDF unchanged;
   · every mark is stored against a block key + character offsets, never
     against a DOM node — the page is rebuilt from scratch on every render;
   · anything the reader wrote is blue, in the other face, and labelled, so a
     printed sheet never passes it off as the lesson's own words.
   ========================================================================== */
  const MK_STYLES = ['fill', 'tex', 'line', 'wave'];
  const MKW: Phrase = {
    note: { de: 'Meine Notiz', en: 'My note', ru: 'Моя заметка' },
    ph: {
      de: 'Eigener Gedanke, Frage, Antwort …',
      en: 'A thought, a question, an answer …',
      ru: 'Своя мысль, вопрос, ответ…',
    },
    legend: {
      de: 'Farbige Blöcke mit Datum und eingefügte Wörter stammen vom Leser; sie gehören nicht zum Text der Lektion.',
      en: "The dated blocks with a coloured bar, and the words inserted into the lines, are the reader's own; they are not part of the lesson.",
      ru: 'Блоки с цветной полосой и датой, а также вписанные в строку слова — от читателя; они не входят в текст урока.',
    },
    ins: { de: 'Eigenen Text einfügen', en: 'Write your own here', ru: 'Вписать своё' },
    addnote: { de: 'Eigene Notiz', en: 'Own note', ru: 'Своя заметка' },
    copy: { de: 'Mit Bibelstelle kopieren', en: 'Copy with the reference', ru: 'Копировать со ссылкой' },
    erase: { de: 'Entfernen', en: 'Remove', ru: 'Стереть' },
    more: { de: 'Mehr Farben und Formen', en: 'More colours and shapes', ru: 'Ещё цвета и фигуры' },
    own: { de: 'Eigene Farbe', en: 'Own colour', ru: 'Свой цвет' },
    copied: { de: 'Kopiert', en: 'Copied', ru: 'Скопировано' },
    marks: { de: 'Markierungen', en: 'Marks', ru: 'Пометки' },
    keys: { de: 'Kurzbefehle', en: 'Shortcuts', ru: 'Подсказки' },
    marking: { de: 'Marker und Notizen', en: 'Marker and notes', ru: 'Маркер и заметки' },
    pinhint: {
      de: 'Doppelklick — Farbe festhalten',
      en: 'Double-click to pin the colour',
      ru: 'Двойной клик — закрепить цвет',
    },
    pinned: { de: 'Farbe festgehalten', en: 'Colour pinned', ru: 'Цвет закреплён' },
    unpinned: { de: 'Farbe losgelassen', en: 'Colour unpinned', ru: 'Цвет откреплён' },
    markit: { de: 'Markieren?', en: 'Mark it?', ru: 'Разметить?' },
    railon: { de: 'An', en: 'On', ru: 'Вкл' },
    railoff: { de: 'Aus', en: 'Off', ru: 'Выкл' },
    railshown: { de: 'Das Etui steht links', en: 'The rail stands on the left', ru: 'Пенал стоит слева' },
    railhid: { de: 'Etui weg — nur lesen', en: 'Rail away — just reading', ru: 'Пенал убран — просто чтение' },
    up: { de: 'Marker nehmen', en: 'Take the marker', ru: 'Взять маркер' },
    down: { de: 'Werkzeug weglegen', en: 'Put the tool down', ru: 'Положить инструмент' },
    kept: { de: 'In diesem Browser gespeichert', en: 'Kept in this browser', ru: 'Сохранено в этом браузере' },
    wipe: { de: 'Lektion leeren', en: 'Clear this lesson', ru: 'Стереть урок' },
    wipehint: {
      de: 'Alle Striche, Einfügungen und Notizen dieser Lektion. Danach lässt es sich zurückholen.',
      en: 'Every stroke, insertion and note of this lesson. It can be taken back right after.',
      ru: 'Все мазки, вставки и заметки этого урока. Сразу после можно вернуть.',
    },
    sure: { de: 'Sicher?', en: 'Sure?', ru: 'Точно?' },
    undo: { de: 'Zurückholen', en: 'Undo', ru: 'Вернуть' },
    cleared: { de: 'Lektion geleert', en: 'Lesson cleared', ru: 'Урок очищен' },
    marker: { de: 'Marker', en: 'Marker', ru: 'Маркер' },
    mkoff: {
      de: 'Marker aus — Text lässt sich normal markieren',
      en: 'Marker off — the text selects normally',
      ru: 'Маркер выключен — текст выделяется как обычно',
    },
    mkon: { de: 'Marker an', en: 'Marker on', ru: 'Маркер включён' },
    instant: { de: 'Sofort', en: 'Instant', ru: 'Сразу' },
    fill: { de: 'Marker', en: 'Highlighter', ru: 'Маркер' },
    tex: { de: 'Strich', en: 'Stroke', ru: 'Штрих' },
    line: { de: 'Linie', en: 'Line', ru: 'Линия' },
    wave: { de: 'Welle', en: 'Wave', ru: 'Волна' },
    fmtb: { de: 'Fett', en: 'Bold', ru: 'Жирный' },
    fmti: { de: 'Kursiv', en: 'Italic', ru: 'Курсив' },
    fmtu: { de: 'Unterstrichen', en: 'Underline', ru: 'Подчёркнутый' },
    fmtq: { de: 'Zitat', en: 'Quotation', ru: 'Цитата' },
  };
  function T(k: string) {
    const w = MKW[k] || {};
    return w[lang] || w.en || '';
  }
  const APP_VERSION = '2.1';
  /* what this release brought, in the language of the lesson */
  const MK_NEW: [string, Dict][] = [
    ['title', { de: 'Neu in 2.1', en: 'New in 2.1', ru: 'Что нового в 2.1' }],
    ['cap', { de: 'Werkzeug zuerst', en: 'The tool comes first', ru: 'Сначала инструмент' }],
    [
      '✱',
      {
        de: 'Links steht das Etui: Strichart und Farbe werden genommen, bevor markiert wird — danach färbt jede Markierung, ohne dass etwas aufklappt',
        en: 'The rail stands on the left: a stroke and a colour are taken before marking — after that every selection is painted and nothing pops up',
        ru: 'Слева стоит пенал: тип штриха и цвет берутся до разметки — дальше каждое выделение красится, и ничего не всплывает',
      },
    ],
    [
      '✱ ',
      {
        de: 'Nichts in der Hand heißt: der Text lässt sich ganz normal markieren und kopieren',
        en: 'Nothing in hand means the text selects and copies like anywhere else',
        ru: 'Ничего в руке — текст выделяется и копируется как везде',
      },
    ],
    [
      '✱  ',
      {
        de: 'Cursor, Auswahlfarbe und die leuchtende Taste zeigen dasselbe: was gerade in der Hand ist',
        en: 'The cursor, the selection colour and the lit button all say the same thing: what is in hand',
        ru: 'Курсор, цвет выделения и горящая кнопка говорят одно: что сейчас в руке',
      },
    ],
    [
      '✱   ',
      {
        de: 'Eigener Text und eigene Notiz: Werkzeug nehmen, einmal tippen, fertig',
        en: 'Your own words and your own note: take the tool, click once, done',
        ru: 'Свой текст и своя заметка: взял инструмент, один клик — готово',
      },
    ],
    [
      '✱    ',
      {
        de: 'Kopieren mit Bibelstelle als eigenes Werkzeug',
        en: 'Copying with the reference is a tool of its own',
        ru: 'Копирование со ссылкой — отдельный инструмент',
      },
    ],
    [
      '✱     ',
      {
        de: 'Der Strich endet rund wie ein Filzstift und hängt an ganzen Wörtern — kein halbes Wort, keine Naht in der Mitte',
        en: 'The stroke ends round like a felt pen and holds to whole words — no half word, no seam in the middle',
        ru: 'Мазок кончается круглым носом, как фломастер, и держится целых слов — ни половины слова, ни шва посередине',
      },
    ],
    ['cap2', { de: 'Und außerdem', en: 'And besides', ru: 'И ещё' }],
    [
      '✱     ',
      {
        de: 'Auf einen Strich tippen: die Blase bleibt offen, solange Farben durchprobiert werden',
        en: 'Tap a stroke: the bubble stays open while the colours are tried',
        ru: 'Нажал на мазок — пузырь не закрывается, пока перебираешь цвета',
      },
    ],
    [
      '✱      ',
      {
        de: 'Der Zähler unten am Etui sagt, wie viel gespeichert ist und wo',
        en: 'The counter at the foot of the rail says how much is kept, and where',
        ru: 'Счётчик внизу пенала говорит, сколько сохранено и где',
      },
    ],
    [
      '✱       ',
      {
        de: 'Am Tablet und am Telefon legt sich das Etui an den unteren Rand',
        en: 'On a tablet and a phone the rail lies down along the bottom edge',
        ru: 'На планшете и телефоне пенал ложится вдоль нижнего края',
      },
    ],
  ];
  /* the whole cheat sheet in one place, in the language of the lesson */
  const MK_KEYS: [string, Dict][] = [
    ['title', { de: 'Tasten und Gesten', en: 'Keys and gestures', ru: 'Клавиши и жесты' }],
    ['cap', { de: 'So wird gearbeitet', en: 'How it works', ru: 'Как это работает' }],
    [
      '✱',
      {
        de: 'Werkzeug links nehmen — markieren — wieder weglegen. Solange es in der Hand ist, färbt jede Markierung.',
        en: 'Take a tool on the left, mark away, put it back. While it is in hand every selection is painted.',
        ru: 'Взял инструмент слева — размечаешь — положил. Пока он в руке, каждое выделение красится.',
      },
    ],
    [
      '✱ ',
      {
        de: 'Nichts in der Hand: der Text lässt sich ganz normal markieren und kopieren',
        en: 'Nothing in hand: the text selects and copies as anywhere else',
        ru: 'Ничего в руке — текст выделяется и копируется как обычно',
      },
    ],
    [
      '✱  ',
      {
        de: 'Auf einen Strich tippen — Farbe wechseln, Notiz anhängen, abnehmen',
        en: 'Tap a stroke — change its colour, hang a note on it, take it off',
        ru: 'Нажать на мазок — сменить цвет, повесить заметку, снять',
      },
    ],
    ['cap2', { de: 'Tasten', en: 'Keys', ru: 'Клавиши' }],
    [
      '1 – 4',
      {
        de: 'Marker · Strich · Linie · Welle (nochmal drücken = weglegen)',
        en: 'Highlighter · stroke · line · wave (press again to put it down)',
        ru: 'Маркер · штрих · линия · волна (ещё раз — положить)',
      },
    ],
    [
      'M',
      {
        de: 'Letztes Werkzeug nehmen oder weglegen',
        en: 'Take the last tool or put it down',
        ru: 'Взять последний инструмент или положить',
      },
    ],
    [
      'I',
      {
        de: 'Eigenen Text schreiben — dann einmal in die Zeile tippen',
        en: 'Write your own — then click once into the line',
        ru: 'Вписать своё — потом один клик в строку',
      },
    ],
    [
      'N',
      {
        de: 'Eigene Notiz — dann auf den Absatz tippen',
        en: 'Own note — then click the paragraph',
        ru: 'Своя заметка — потом клик по абзацу',
      },
    ],
    [
      'E',
      {
        de: 'Radierer — markieren nimmt alles weg',
        en: 'Eraser — a selection takes everything off',
        ru: 'Ластик — выделение снимает всё',
      },
    ],
    [
      'C',
      {
        de: 'Kopieren mit Bibelstelle — einfach markieren',
        en: 'Copy with the reference — just select',
        ru: 'Копировать со ссылкой — просто выдели',
      },
    ],
    [
      '⌘B ⌘I',
      {
        de: 'Fett und kursiv — in der eigenen Notiz und im eigenen Text in der Zeile',
        en: 'Bold and italic — in your own note and in your own words in the line',
        ru: 'Жирный и курсив — в своей заметке и в своих словах внутри строки',
      },
    ],
    [
      '⌘⇧9',
      {
        de: 'Zitat: die Zeile wird gesetzt wie die Zitate der Lektion. Auch über die Taste \u201e am Kopf der Notiz oder indem die Zeile mit \u00bb> \u00ab beginnt',
        en: 'Quotation: the line is set the way the lesson sets its quotes. Also the \u201e button at the head of the note, or start the line with \u201c> \u201d',
        ru: 'Цитата: строка ставится так же, как цитаты урока. Ещё кнопка \u201e в шапке заметки или начать строку с \u00ab> \u00bb',
      },
    ],
    [
      'Esc',
      {
        de: 'Werkzeug weglegen, alles schließen',
        en: 'Put the tool down, close everything',
        ru: 'Положить инструмент, всё закрыть',
      },
    ],
  ];
  /* what the reader should know about where his work lives */
  const MK_STORE: [string, Dict][] = [
    ['title', { de: 'Wo die Markierungen liegen', en: 'Where the marks are kept', ru: 'Где лежат пометки' }],
    [
      '✱',
      {
        de: 'In diesem Browser, auf diesem Gerät — nicht auf einem Server',
        en: 'In this browser, on this device — not on a server',
        ru: 'В этом браузере, на этом устройстве — не на сервере',
      },
    ],
    [
      '✱ ',
      {
        de: 'Getrennt für jede Lektion und jede Sprache',
        en: 'Separately for every lesson and every language',
        ru: 'Отдельно по каждому уроку и языку',
      },
    ],
    [
      '✱  ',
      {
        de: 'Auf einem anderen Gerät sind sie nicht da; Browserdaten löschen löscht auch sie',
        en: 'They are not there on another device; clearing browser data clears them too',
        ru: 'На другом устройстве их не будет; очистка данных браузера удалит и их',
      },
    ],
    [
      '✱   ',
      {
        de: 'Ins PDF kommen sie mit — das PDF ist die Kopie zum Behalten',
        en: 'They come along into the PDF — that is the copy to keep',
        ru: 'В PDF они уходят — это и есть копия, которая останется',
      },
    ],
  ];

  const mkRail = byId('rail'),
    mkBub = byId('bub'),
    mkPickBox = byId('rpick'),
    mkInks = byId('inks'),
    mkArea = byId('mkarea'),
    mkHue = byId('mkhue'),
    mkToastEl = byId('mtoast');

  function mkGet<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem('sbl.' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  }
  function mkSet(k: string, v: unknown) {
    try {
      localStorage.setItem('sbl.' + k, JSON.stringify(v));
    } catch {
      /* nothing to do: the page carries on without it */
    }
  }
  let mkTool = mkGet('pen', { c: '#ffd84d', s: 'fill' });
  /* eight inks in the row — the same width as the row of tools below it, so the
   panel reads as one block and not as two ledges */
  const MK_KEEP = 8;
  let mkRecent = mkGet('recent8', [
    '#ffd84d',
    '#ffb35c',
    '#ffaec8',
    '#e0a9f5',
    '#a8c9ff',
    '#8fe0d8',
    '#a9e58c',
    '#ff8d8d',
  ]);
  /* pinned inks hold their seats: the row of last-used shuffles around them */
  const mkPins = mkGet<string[]>('pins', []);
  function mkInkRow() {
    const rest = mkRecent.filter(function (c) {
      return mkPins.indexOf(c) < 0;
    });
    return mkPins.concat(rest).slice(0, 7);
  }
  function mkPinToggle(c: string) {
    const i = mkPins.indexOf(c);
    if (i >= 0) mkPins.splice(i, 1);
    else if (mkPins.length < 7) mkPins.push(c);
    mkSet('pins', mkPins);
    mkRailInks();
    mkToast(T(i >= 0 ? 'unpinned' : 'pinned'));
  }
  let mkMode: string | null = null; /* null | "mark" | "ins" | "note" | "erase" | "copy" — the tool in hand */
  /* The first time round the rail is out, so nobody has to guess the tools are
   there. Put it away once and it stays away — the choice is remembered. The
   lesson still opens as a lesson: the rail is only the box, nothing is in hand
   until a tool is taken. */
  let mkRailOn = mkGet('rail', true);
  let MKALL = mkGet<Record<string, PageMarks>>('pencil', {}); /* lang/lesson → {marks, ins, notes} */
  let mkQuiet = false,
    mkGroup: HTMLElement[] | null = null;

  function mkRemember(c: string, s: string) {
    mkTool = { c: c, s: s };
    mkSet('pen', mkTool);
    mkRecent = [c]
      .concat(
        mkRecent.filter(function (x) {
          return x !== c;
        })
      )
      .slice(0, MK_KEEP);
    mkSet('recent8', mkRecent);
    mkRailInks();
  }
  let mkToastT: ReturnType<typeof setTimeout> | undefined;
  function mkToast(t: string, undo?: () => void) {
    mkToastEl.textContent = t;
    if (undo) {
      const b = document.createElement('b');
      b.textContent = '↩ ' + T('undo');
      b.onclick = function () {
        mkToastEl.classList.remove('on');
        undo();
      };
      mkToastEl.appendChild(b);
    }
    mkToastEl.classList.add('on');
    clearTimeout(mkToastT);
    mkToastT = setTimeout(
      function () {
        mkToastEl.classList.remove('on');
      },
      undo ? 9000 : 1900
    );
  }
  function mkRgb(h: string) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  /* one function draws every stroke, in any colour the reader picks */
  /* The end of a felt pen is not a straight cut. Each end is its own little
   shape of fixed width, so it never stretches with the stroke: the ink runs
   out in a soft round nose the way it does on paper. */
  function mkCap(c: string, right: boolean) {
    const col = encodeURIComponent(c);
    const d = right
      ? 'M0 1.4c5.4-.6 9 1.2 10.6 5.2 1.5 3.8 1.6 12.6 0 17.8-1.6 5.2-5.2 7.4-10.6 6.8z'
      : 'M12 1.4C6.6.8 3 2.6 1.4 6.6c-1.5 3.8-1.6 12.6 0 17.8C3 29.6 6.6 31.8 12 31.2z';
    return (
      'url("data:image/svg+xml;charset=utf8,' +
      "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 33' preserveAspectRatio='none'%3E" +
      "%3Cpath d='" +
      encodeURIComponent(d) +
      "' fill='" +
      col +
      "' opacity='.84'/%3E%3C/svg%3E\")"
    );
  }
  /* the ink is put on the element, not just handed back: the fill needs three
   background layers, and the layers need their own sizes and places */
  function mkInkTo(el: HTMLElement, c: string, s: string, ps: boolean, pe: boolean) {
    el.style.backgroundImage = mkInk(c, s, ps, pe);
    if (s !== 'fill') {
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
      return;
    }
    const W = 0.42,
      L = ps !== false,
      R = pe !== false;
    const sizes = [],
      poss = [];
    if (L) {
      sizes.push(W + 'em 1.04em');
      poss.push('left .16em');
    }
    if (R) {
      sizes.push(W + 'em 1.04em');
      poss.push('right .16em');
    }
    sizes.push('calc(100% - ' + ((L ? W : 0) + (R ? W : 0)) + 'em) 1.04em');
    poss.push((L ? W + 'em' : '0') + ' .16em');
    el.style.backgroundSize = sizes.join(',');
    el.style.backgroundPosition = poss.join(',');
  }
  function mkInk(c: string, s: string, ps: boolean, pe: boolean) {
    const p = mkRgb(c),
      A = function (a: number) {
        return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')';
      },
      col = encodeURIComponent(c);
    if (s === 'fill') {
      /* the density holds a plateau the whole way; the tapered ends are drawn
       only where the selection really begins and ends, so a piece that is one
       of several shows no seam in the middle */
      /* body: an even bed of ink with a little more weight at the bottom, where
       it would settle on paper; the ends are the caps above */
      const body = 'linear-gradient(178deg,' + A(0.78) + ' 0%,' + A(0.86) + ' 55%,' + A(0.9) + ' 100%)';
      const out = [];
      if (ps !== false) out.push(mkCap(c, false));
      if (pe !== false) out.push(mkCap(c, true));
      out.push(body);
      return out.join(',');
    }
    let svg;
    if (s === 'tex')
      svg =
        "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 34' preserveAspectRatio='none'%3E%3Cpath d='M3.4 11.6c14-3.4 41-5.9 78-6.8 37-.9 84 .4 120 2.1 14 .7 27 1.9 35 3.4 3 .6 3.6 1.8 3 4.6-.7 3.3-1.4 7.7-3.1 10.4-1.3 2-5 2.5-11 3-31 2.4-96 3.9-150 3.1-27-.4-48-1.3-60-2.7-8-.9-11-2.2-12-4.6-1-2.6-1.4-6.9-.9-9.6.3-1.9 1-2.6 1-2.9z' fill='" +
        col +
        "' opacity='.8'/%3E%3Cpath d='M9 22.6c22 2.2 62 3.4 112 3.5 46 .1 88-.7 111-2.2' stroke='" +
        col +
        "' stroke-width='2.6' fill='none' opacity='.45' stroke-linecap='round'/%3E%3C/svg%3E";
    else if (s === 'line')
      svg =
        "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 12' preserveAspectRatio='none'%3E%3Cpath d='M2 7.5c26-3.2 62-4.4 99-3.9 34 .5 71 2.4 97 4.8' stroke='" +
        col +
        "' stroke-width='2.6' fill='none' stroke-linecap='round'/%3E%3Cpath d='M6 10.2c30-2.4 66-3.1 101-2.7' stroke='" +
        col +
        "' stroke-width='1.3' fill='none' opacity='.45' stroke-linecap='round'/%3E%3C/svg%3E";
    else
      svg =
        "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 12' preserveAspectRatio='none'%3E%3Cpath d='M1 8c4-4.2 8-4.2 12 0s8 4.2 12 0 8-4.2 12 0 8 4.2 12 0 8-4.2 10-1.4' stroke='" +
        col +
        "' stroke-width='1.9' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";
    return 'url("data:image/svg+xml;charset=utf8,' + svg + '")';
  }

  /* ——— the ink itself ——— */
  function mkOwn(n: Node) {
    return !!asElem(n.parentNode)?.closest('.myins,.mynote');
  }
  function mkWalk(b: Node) {
    return document.createTreeWalker(b, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return mkOwn(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
  }
  /* A stroke is never left cutting a word in half: whatever the hand caught,
   the range grows out to whole words first. It is what makes a highlight look
   deliberate instead of brushed. */
  const MK_EDGE = /[\s.,;:!?()[\]«»"'“”„…—–-]/;
  function mkSnapWords(r: Range) {
    let n = r.startContainer,
      o = r.startOffset;
    if (n.nodeType === 3) {
      const t = n.nodeValue!;
      while (o > 0 && !MK_EDGE.test(t[o - 1])) o--;
      r.setStart(n, o);
    }
    n = r.endContainer;
    o = r.endOffset;
    if (n.nodeType === 3) {
      const t = n.nodeValue!;
      while (o < t.length && !MK_EDGE.test(t[o])) o++;
      r.setEnd(n, o);
    }
    return r;
  }
  let mkGid = 0;
  /* One stroke wants to be one element. If the range swallows whole tags — the
   bold label of a memory verse, an italic book title — the browser can wrap it
   in a single <mark>, and a single background has no seams to show: no white
   hairline, no darker notch where two pieces met. Only a range that cuts a tag
   in half falls back to piece-by-piece. */
  function mkWhole(range: Range, c: string, s: string, g: string) {
    let frag;
    try {
      frag = range.cloneContents();
    } catch {
      return false;
    }
    if (frag.querySelector) {
      if (frag.querySelector<HTMLElement>('.myins,.mynote')) return false; /* never tint the reader's own words */
      if (frag.querySelector<HTMLElement>('mark[data-c="' + c + '"][data-y="' + s + '"]'))
        return false; /* same ink already there */
    }
    const m = document.createElement('mark');
    m.className = s + ' ps pe';
    m.dataset.c = c;
    m.dataset.y = s;
    m.dataset.g = g;
    mkInkTo(m, c, s, true, true);
    try {
      range.surroundContents(m);
    } catch {
      return false;
    }
    return true;
  }
  function mkPaint(range: Range, c: string, s: string) {
    const g = ++mkGid;
    mkLastSel = null; /* a selection is spent once it has been painted */
    try {
      mkSnapWords(range);
    } catch {
      /* nothing to do: the page carries on without it */
    }
    if (mkWhole(range, c, s, String(g))) {
      const host = asElem(
        range.commonAncestorContainer.nodeType === 1
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement
      );
      const pg = host ? host.closest<HTMLElement>('.page') || host : host;
      if (pg) mkMerge(pg, String(g));
      mkStore();
      return g;
    }
    const sc = range.startContainer,
      so = range.startOffset,
      ec = range.endContainer,
      eo = range.endOffset;
    const root = range.commonAncestorContainer;
    /* a second pass in a different colour darkens, as real ink does — but the
     same colour laid twice over the same words only makes a dirty patch, so
     that piece is left alone */
    const already = function (n: Node) {
      let p = n.parentElement;
      while (p && !(p.dataset && p.dataset.k)) {
        if (p.tagName === 'MARK' && p.dataset.c === c && p.dataset.y === s) return true;
        p = p.parentElement;
      }
      return false;
    };
    const w = document.createTreeWalker((root.nodeType === 1 ? root : root.parentNode) as Node, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue!.replace(/\s/g, '')) return NodeFilter.FILTER_REJECT;
        if (mkOwn(n) || already(n)) return NodeFilter.FILTER_REJECT;
        return range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes: Node[] = [];
    let n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (node, i) {
      let a = 0,
        b = node.nodeValue!.length;
      if (node === sc) a = so;
      if (node === ec) b = eo;
      if (b <= a) return;
      const r = document.createRange();
      r.setStart(node, a);
      r.setEnd(node, b);
      const ps = i === 0,
        pe = i === nodes.length - 1;
      const m = document.createElement('mark');
      m.className = s + (ps ? ' ps' : '') + (pe ? ' pe' : '');
      m.dataset.c = c;
      m.dataset.y = s;
      m.dataset.g = String(g);
      mkInkTo(m, c, s, ps, pe);
      try {
        r.surroundContents(m);
      } catch {
        /* nothing to do: the page carries on without it */
      }
    });
    const blk = asElem(root.nodeType === 1 ? root : root.parentElement);
    const host = blk ? blk.closest<HTMLElement>('.page') || blk : blk;
    if (host) mkMerge(host, String(g));
    mkStore();
    return g;
  }
  /* Two strokes of the same colour standing side by side are one stroke: they
   are joined into a single element. Otherwise their edges meet exactly on the
   character boundary and a white hairline shows through between them. */
  function mkMerge(scope: HTMLElement, g: string) {
    let again = true;
    while (again) {
      again = false;
      Array.from(scope.querySelectorAll<HTMLElement>('mark')).forEach(function (m) {
        if (!m.parentNode) return;
        let sib = m.nextSibling;
        while (sib && sib.nodeType === 3 && !sib.nodeValue!.length) sib = sib.nextSibling;
        if (!sib || sib.nodeType !== 1 || (sib as HTMLElement).tagName !== 'MARK') return;
        const n = sib as HTMLElement;
        if (n.dataset.c !== m.dataset.c || n.dataset.y !== m.dataset.y) return;
        while (n.firstChild) m.appendChild(n.firstChild);
        if ((n as HTMLElement).classList.contains('pe')) m.classList.add('pe');
        if (g && (n.dataset.g === g || m.dataset.g === g)) m.dataset.g = g;
        n.remove();
        mkInkTo(
          m,
          m.dataset.c as string,
          m.dataset.y as string,
          m.classList.contains('ps'),
          m.classList.contains('pe')
        );
        again = true;
      });
    }
  }
  /* the pieces of one stroke keep a common number, so a stroke torn apart by a
   <b> in the middle is still recoloured, erased and picked up as one thing */
  function mkPieces(g: string) {
    return Array.from(document.querySelectorAll<HTMLElement>('mark[data-g="' + g + '"]'));
  }
  function mkUnwrap(el: Element) {
    const p = el.parentNode!;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
    p.normalize();
  }

  /* ——— anchors: block key + offset in characters, own text not counted ——— */
  function mkOffsets(b: HTMLElement, s: number, e: number) {
    const w = mkWalk(b);
    let n,
      acc = 0,
      open = false;
    const r = document.createRange();
    while ((n = w.nextNode())) {
      const len = n.nodeValue!.length;
      if (!open && acc + len > s) {
        r.setStart(n, s - acc);
        open = true;
      }
      if (open && acc + len >= e) {
        r.setEnd(n, e - acc);
        return r;
      }
      acc += len;
    }
    return null;
  }
  function mkChain(n: Node) {
    const out: { c?: string; y?: string }[] = [];
    let p = n.parentElement;
    while (p && !p.classList.contains('page')) {
      if (p.tagName === 'MARK') out.unshift({ c: p.dataset.c, y: p.dataset.y });
      p = p.parentElement;
    }
    return out;
  }
  /* the key comes from the sheet itself, not from the current setting: a late
   save (a note losing focus while the language is already switching) must not
   file German marks under the Russian lesson */
  function mkKey(pg: HTMLElement) {
    return (pg.dataset.lang || lang) + '/' + pg.dataset.les;
  }
  function mkStore() {
    if (mkQuiet) return;
    document.querySelectorAll<HTMLElement>('.page[data-les]').forEach(function (pg) {
      const out: PageMarks = { marks: [], ins: [], notes: [] };
      pg.querySelectorAll<HTMLElement>('[data-k]').forEach(function (b) {
        const k = b.dataset.k;
        const w = mkWalk(b);
        let n,
          acc = 0,
          cur = null;
        while ((n = w.nextNode())) {
          const ch = mkChain(n),
            key = JSON.stringify(ch);
          if (cur && cur.j !== key) {
            out.marks.push({ k: cur.k, s: cur.s, e: cur.e, ch: cur.ch });
            cur = null;
          }
          if (ch.length) {
            if (!cur) cur = { k: k, s: acc, e: acc + n.nodeValue!.length, ch: ch, j: key };
            else cur.e = acc + n.nodeValue!.length;
          }
          acc += n.nodeValue!.length;
        }
        if (cur) out.marks.push({ k: cur.k, s: cur.s, e: cur.e, ch: cur.ch });
        /* own insertions: where they sit in the clean text of the block */
        b.querySelectorAll<HTMLElement>('.myins').forEach(function (el) {
          const w2 = mkWalk(b);
          let m,
            off = 0;
          const probe = document.createRange();
          probe.setStartBefore(el);
          probe.collapse(true);
          while ((m = w2.nextNode())) {
            if (probe.comparePoint(m, m.nodeValue!.length) <= 0) {
              off += m.nodeValue!.length;
              continue;
            }
            break;
          }
          out.ins.push({ k: k, s: off, t: mkInsText(el), h: mkClean(mkInsHtml(el)) });
        });
      });
      pg.querySelectorAll<HTMLElement>('.mynote').forEach(function (el) {
        const prev = el.previousElementSibling as HTMLElement | null;
        if (prev && prev.dataset.k)
          out.notes.push({ k: prev.dataset.k as string, t: mkClean(mkNoteBody(el).innerHTML), c: el.dataset.c });
      });
      MKALL[mkKey(pg)] = out;
    });
    mkSet('pencil', MKALL);
    mkLegend();
    mkChipPaint();
  }
  function mkLegend() {
    document.querySelectorAll<HTMLElement>('.page[data-les]').forEach(function (pg) {
      const l = pg.querySelector<HTMLElement>('.legend');
      if (!l) return;
      const has = pg.querySelector<HTMLElement>('.myins,.mynote');
      l.innerHTML = has ? '<span class="sw"></span>' + esc(T('legend')) : '';
      l.classList.toggle('has', !!has);
    });
  }
  /* the page is rebuilt on every render, so restoring means: wipe whatever is on
   it and lay the stored marks down again from the anchors */
  function mkRestore() {
    mkQuiet = true;
    document.querySelectorAll<HTMLElement>('.page[data-les]').forEach(function (pg) {
      pg.querySelectorAll<HTMLElement>('mark').forEach(mkUnwrap);
      pg.querySelectorAll<HTMLElement>('.myins,.mynote').forEach(function (e) {
        e.remove();
      });
      const d = MKALL[mkKey(pg)];
      if (!d) return;
      (d.marks || []).forEach(function (o) {
        const b = pg.querySelector<HTMLElement>('[data-k="' + o.k + '"]');
        if (!b) return;
        (o.ch || []).forEach(function (step) {
          const r = mkOffsets(b, o.s, o.e);
          if (r) mkPaint(r, step.c as string, step.y as string);
        });
      });
      (d.ins || []).forEach(function (o) {
        const b = pg.querySelector<HTMLElement>('[data-k="' + o.k + '"]');
        if (!b) return;
        const r = mkOffsets(b, o.s, o.s + 1);
        if (!r) return;
        r.collapse(true);
        mkInsert(r, (o.h || o.t) as string, true, !!o.h);
      });
      (d.notes || []).forEach(function (o) {
        const b = pg.querySelector<HTMLElement>('[data-k="' + o.k + '"]');
        if (!b) return;
        mkNote(b, o.t, true, o.c);
      });
    });
    mkQuiet = false;
    mkLegend();
    mkChipPaint();
  }

  /* ——— the reader's own words ——— */
  /* the reader's own words, written into the line itself. They carry their own
   little cross: an insertion in the middle of a paragraph must be as easy to
   take back as it was to put in. */
  function mkInsText(el: Element) {
    const c = el.cloneNode(true) as HTMLElement,
      d = c.querySelector<HTMLElement>('.del');
    if (d) d.remove();
    return c.textContent;
  }
  function mkInsHtml(el: Element) {
    const c = el.cloneNode(true) as HTMLElement,
      d = c.querySelector<HTMLElement>('.del');
    if (d) d.remove();
    return c.innerHTML;
  }
  function mkInsert(range: Range, text: string, quiet?: boolean, html?: boolean) {
    const s = document.createElement('span');
    s.className = 'myins';
    s.contentEditable = 'true';
    s.spellcheck = false;
    let t;
    if (html) {
      const w = document.createElement('span');
      w.innerHTML = mkClean(text || '');
      t = w;
    } else t = document.createTextNode(text || '');
    const x = document.createElement('span');
    x.className = 'del';
    x.contentEditable = 'false';
    x.textContent = '×';
    x.title = T('erase');
    x.onmousedown = function (e) {
      e.preventDefault();
    };
    x.onclick = function (e) {
      e.stopPropagation();
      s.remove();
      mkStore();
    };
    if (html) {
      while (t.firstChild) s.appendChild(t.firstChild);
    } else s.appendChild(t);
    s.appendChild(x);
    range.insertNode(s);
    s.addEventListener('input', mkStoreSoon);
    /* bold and italic work inside the line as they do inside a note */
    s.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'i' || k === 'u') {
        e.preventDefault();
        mkCmd(k === 'b' ? 'bold' : k === 'u' ? 'underline' : 'italic');
        mkStore();
      }
    });
    s.addEventListener('blur', function () {
      if (!mkInsText(s).trim()) s.remove();
      mkStore();
    });
    if (!quiet) {
      const r = document.createRange();
      r.setStartBefore(x);
      r.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(r);
      s.focus();
      mkStore();
    }
    return s;
  }
  let mkNoteFocused: HTMLElement | null = null;
  /* what is being written is kept as it is written, not only when the note is
   left: a tab closed mid-sentence must not lose the sentence */
  let mkTypeT: ReturnType<typeof setTimeout> | undefined;
  function mkStoreSoon() {
    clearTimeout(mkTypeT);
    mkTypeT = setTimeout(mkStore, 400);
  }
  function mkNoteBody(d: HTMLElement) {
    const c = d.cloneNode(true) as HTMLElement;
    c.querySelectorAll<HTMLElement>('.del,.foot,.lab,.fmt').forEach(function (x) {
      x.remove();
    });
    return c;
  }
  /* what may live inside the reader's own text: bold, italic, a quotation, a line
   break. Everything else — a pasted colour, a foreign class — is unwrapped, so
   what is stored is always the same handful of tags */
  const MK_TAGS: Record<string, number> = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BLOCKQUOTE: 1, DIV: 1, BR: 1 };
  function mkAs(el: HTMLElement, tag: string) {
    const n = document.createElement(tag);
    while (el.firstChild) n.appendChild(el.firstChild);
    el.parentNode!.replaceChild(n, el);
    return n;
  }
  function mkClean(html: string) {
    const t = document.createElement('div');
    t.innerHTML = String(html || '');
    (function walk(el: Element) {
      Array.from(el.children).forEach(function (c: Element) {
        walk(c);
        if (!MK_TAGS[c.tagName]) {
          /* the browser sometimes leaves a styled span behind — keep the meaning,
           drop the style */
          const st = (c.getAttribute && c.getAttribute('style')) || '';
          if (/font-weight:\s*(bold|[6-9]00)/i.test(st)) mkAs(c as HTMLElement, 'b');
          else if (/font-style:\s*italic/i.test(st)) mkAs(c as HTMLElement, 'i');
          else if (/text-decoration[^:]*:[^;]*underline/i.test(st)) mkAs(c as HTMLElement, 'u');
          else mkUnwrap(c);
        } else
          Array.from(c.attributes).forEach(function (a) {
            c.removeAttribute(a.name);
          });
      });
    })(t);
    return t.innerHTML;
  }
  function mkNoteText(d: HTMLElement) {
    return (mkNoteBody(d).textContent || '').trim();
  }
  function mkNoteTint(d: HTMLElement, c?: string) {
    const p = mkRgb(c || '#2f5bd0');
    d.dataset.c = c || '#2f5bd0';
    d.style.setProperty('--nc', c || '#2f5bd0');
    d.style.setProperty('--nbg', 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',.10)');
    d.style.setProperty('--nbd', 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',.22)');
  }
  /* the line of the note the caret sits in — never the label, the cross or the bar */
  function mkNoteLine(d: HTMLElement) {
    const sel = window.getSelection()!;
    if (!sel.rangeCount) return null;
    let n = sel.getRangeAt(0).startContainer;
    if (!d.contains(n)) return null;
    while (n && n.parentNode !== d) n = n.parentNode as Node;
    if (!n) return null;
    if (
      n.nodeType === 1 &&
      (n as HTMLElement).classList &&
      ((n as HTMLElement).classList.contains('foot') ||
        (n as HTMLElement).classList.contains('lab') ||
        (n as HTMLElement).classList.contains('del') ||
        (n as HTMLElement).classList.contains('fmt'))
    )
      return null;
    return n;
  }
  /* bold and italic as tags, not as inline styles — that is what survives a
   reload and what the printer understands */
  function mkCmd(name: string) {
    try {
      document.execCommand('styleWithCSS', false, false as unknown as string);
    } catch {
      /* nothing to do: the page carries on without it */
    }
    try {
      document.execCommand(name);
    } catch {
      /* nothing to do: the page carries on without it */
    }
  }
  function mkCaretEnd(el: HTMLElement) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = window.getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
  }
  /* the line becomes a quotation, set like the lesson sets its own; pressing again
   gives the line back */
  function mkQuote(d: HTMLElement) {
    const n = mkNoteLine(d);
    if (!n) return;
    let el;
    if (n.nodeType === 1 && (n as HTMLElement).tagName === 'BLOCKQUOTE') {
      el = document.createElement('div');
      while (n.firstChild) el.appendChild(n.firstChild);
      d.replaceChild(el, n);
    } else {
      el = document.createElement('blockquote');
      d.insertBefore(el, n);
      if (n.nodeType === 3) el.appendChild(n);
      else {
        while (n.firstChild) el.appendChild(n.firstChild);
        d.removeChild(n);
      }
    }
    mkCaretEnd(el);
    mkStore();
    mkFmtPaint(d);
  }
  /* ——— the bar of settings for the reader's own text ———
   One bar for the whole page, not one inside every note. It used to sit at the
   foot of the note it belonged to, and two things were wrong with that: a note
   two paragraphs long put its own buttons below the fold, so the block had to
   be scrolled to reach them, and the bar coming and going changed the height of
   the note under the hand. Standing free it costs the note no height at all and
   is in the same place whatever is being written. */
  const mkFmt = byId('fmtbar');
  let mkFmtFor: HTMLElement | null = null; /* the note the bar is working on */
  mkFmt.innerHTML =
    '<span class="b">B</span><span class="i">I</span><span class="u">U</span>' +
    '<span class="q"><svg width="14" height="13" viewBox="0 0 13 12" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round"><path d="M1.5 1.5v9"/>' +
    '<path d="M5 3h6.5M5 6h6.5M5 9h3.8" opacity=".7"/></svg></span>';
  function mkFmtTitles() {
    mkFmt.querySelector<HTMLElement>('.b')!.title = T('fmtb');
    mkFmt.querySelector<HTMLElement>('.i')!.title = T('fmti');
    mkFmt.querySelector<HTMLElement>('.u')!.title = T('fmtu');
    mkFmt.querySelector<HTMLElement>('.q')!.title = T('fmtq');
  }
  function mkFmtPaint(d: HTMLElement) {
    d = d || mkFmtFor;
    if (!d) return;
    const n = mkNoteLine(d);
    let b = false,
      i = false,
      u = false;
    try {
      b = document.queryCommandState('bold');
      i = document.queryCommandState('italic');
      u = document.queryCommandState('underline');
    } catch {
      /* nothing to do: the page carries on without it */
    }
    mkFmt.querySelector<HTMLElement>('.b')!.classList.toggle('on', b);
    mkFmt.querySelector<HTMLElement>('.i')!.classList.toggle('on', i);
    mkFmt.querySelector<HTMLElement>('.u')!.classList.toggle('on', u);
    mkFmt
      .querySelector<HTMLElement>('.q')!
      .classList.toggle('on', !!(n && n.nodeType === 1 && (n as HTMLElement).tagName === 'BLOCKQUOTE'));
  }
  /* a press on the bar must not take the caret out of the text it is about to set */
  mkFmt.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });
  mkFmt.addEventListener('click', function (e) {
    const t = (e.target as HTMLElement).closest('span'),
      d = mkFmtFor;
    if (!t || !d) return;
    e.stopPropagation();
    if (document.activeElement !== d) d.focus();
    if (t.classList.contains('q')) mkQuote(d);
    else {
      mkCmd(t.classList.contains('b') ? 'bold' : t.classList.contains('u') ? 'underline' : 'italic');
      mkStore();
      mkFmtPaint(d);
    }
  });
  /* On a phone the keyboard covers the foot of the window, and a bar pinned to
   the bottom would go behind it. `visualViewport` is what the keyboard actually
   moves, so the bar is placed against that and stays in sight. */
  function mkFmtPlace() {
    if (mkFmt.hidden) return;
    const v = window.visualViewport;
    const bottom = v ? Math.max(8, window.innerHeight - (v.offsetTop + v.height) + 12) : 12;
    mkFmt.style.bottom = 'calc(' + Math.round(bottom) + 'px + env(safe-area-inset-bottom))';
  }
  function mkFmtShow(d: HTMLElement) {
    mkFmtFor = d;
    mkFmtTitles();
    mkFmt.hidden = false;
    mkFmtPlace();
    mkFmtPaint(d);
    requestAnimationFrame(function () {
      mkFmt.classList.add('on');
    });
  }
  function mkFmtHide() {
    mkFmtFor = null;
    mkFmt.classList.remove('on');
    setTimeout(function () {
      if (!mkFmtFor) mkFmt.hidden = true;
    }, 200);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', mkFmtPlace);
    window.visualViewport.addEventListener('scroll', mkFmtPlace);
  }
  function mkNote(afterEl: HTMLElement, html = '', quiet = false, colour?: string) {
    const d = document.createElement('div');
    d.className = 'mynote';
    d.contentEditable = 'true';
    d.spellcheck = false;
    d.dataset.ph = T('ph');
    mkNoteTint(d, colour);
    d.innerHTML = mkClean(html || '');
    /* a note with nothing but its cross has nowhere to put the caret — so an
     empty note is given one empty line to write on */
    if (!d.firstChild) {
      const ln = document.createElement('div');
      ln.appendChild(document.createElement('br'));
      d.appendChild(ln);
    }
    /* no signature, no date and no bar of its own under the note: the colour, the
     other face and the line at the foot of the printed sheet already say whose
     these words are, and the settings for them stand free of the note (`mkFmt`) */
    const del = document.createElement('div');
    del.className = 'del';
    del.contentEditable = 'false';
    del.textContent = '×';
    del.onclick = function (e) {
      e.stopPropagation();
      d.remove();
      mkStore();
    };
    d.appendChild(del);
    /* pasting brings the reader's words, not somebody's markup */
    d.addEventListener('paste', function (e) {
      e.preventDefault();
      const t = (e.clipboardData || (window as unknown as { clipboardData: DataTransfer }).clipboardData).getData(
        'text/plain'
      );
      document.execCommand('insertText', false, t);
    });
    /* ⌘B, ⌘I and ⌘⇧9 do what the three buttons do; typing "> " opens a quotation
     the way it is typed everywhere else */
    d.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'i' || k === 'u') {
        e.preventDefault();
        mkCmd(k === 'b' ? 'bold' : k === 'u' ? 'underline' : 'italic');
        mkStore();
        mkFmtPaint(d);
      } else if (e.shiftKey && e.code === 'Digit9') {
        e.preventDefault();
        mkQuote(d);
      }
    });
    d.addEventListener('input', function () {
      const n = mkNoteLine(d);
      if (!n) return;
      const isQ = n.nodeType === 1 && (n as HTMLElement).tagName === 'BLOCKQUOTE';
      const txt = (n.nodeType === 3 ? n.nodeValue : n.textContent) || '';
      if (!isQ && txt.slice(0, 2) === '> ') {
        if (n.nodeType === 3) n.nodeValue = n.nodeValue!.slice(2);
        else {
          const t = mkFirstText(n);
          if (t) t.nodeValue = t.nodeValue!.replace(/^> /, '');
        }
        mkQuote(d);
      }
    });
    ['keyup', 'mouseup', 'focus'].forEach(function (ev) {
      d.addEventListener(ev, function () {
        mkFmtPaint(d);
      });
    });
    d.addEventListener('focus', function () {
      mkNoteFocused = d;
    });
    d.addEventListener('blur', function () {
      setTimeout(function () {
        if (mkNoteFocused === d) mkNoteFocused = null;
      }, 150);
    });
    afterEl.parentNode!.insertBefore(d, afterEl.nextSibling);
    const blank = function () {
      d.classList.toggle('blank', !mkNoteText(d));
    };
    d.addEventListener('input', blank);
    d.addEventListener('input', mkStoreSoon);
    d.addEventListener('blur', function () {
      if (!mkNoteText(d)) d.remove();
      mkStore();
    });
    blank();
    if (!quiet) {
      const ln = d.querySelector<HTMLElement>('blockquote,div:not(.foot):not(.fmt):not(.lab):not(.del)');
      d.focus();
      if (ln) mkCaretEnd(ln);
      mkStore();
    }
    return d;
  }

  /* ——— THE RAIL — a tool is taken first, then the work is done ———
   Nothing pops up to be found and nothing closes after a click: take the
   yellow marker, run through the lesson phrase by phrase, put it back. */
  function mkSvgCursor(inner: string, hx: number, hy: number) {
    const svg =
      "%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E" + inner + '%3C/svg%3E';
    return 'url("data:image/svg+xml;charset=utf8,' + svg + '") ' + hx + ' ' + hy + ', crosshair';
  }
  /* The pointer is the tool itself, drawn at the angle a hand holds it, with the
   nib exactly on the hot spot — so the ink lands where the point is, not where
   a guessed arrow was. The nib carries the colour that is loaded. */
  function mkToolCursor(mode: string | null, c: string) {
    const col = encodeURIComponent(c || '#ffd84d');
    const E = function (t: string) {
      return t.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23');
    };
    /* held at the angle a hand holds it, turned about its own nib — so the nib
     stays exactly on the hot spot, and the barrel leans up and to the right,
     where there is room for it inside the 32 pixels a cursor gets */
    const hand = function (body: string) {
      return E("<g transform='rotate(28 7 26) translate(7 26) scale(1.15) translate(-7 -26)'>") + body + E('</g>');
    };
    if (mode === 'mark') {
      /* a felt marker: barrel, collar, and the wedge in the ink that is loaded */
      return mkSvgCursor(
        hand(
          E("<path d='M2.2 7a2.2 2.2 0 0 1 2.2-2.2h5.2A2.2 2.2 0 0 1 11.8 7v11H2.2z'") +
            E(" fill='#3c3c41' stroke='#fff' stroke-width='1.5' stroke-linejoin='round'/>") +
            E(
              "<rect x='1.7' y='18' width='10.6' height='3.1' rx='1' fill='#8e8e93' stroke='#fff' stroke-width='1.3'/>"
            ) +
            "%3Cpath d='M3 21.1h8l-1.5 5.3H4.5z' fill='" +
            col +
            "'" +
            E(" stroke='#fff' stroke-width='1.3' stroke-linejoin='round'/>")
        ),
        7,
        26
      );
    }
    if (mode === 'erase') {
      /* a rubber, held the same way, its working corner on the hot spot */
      return mkSvgCursor(
        hand(
          E(
            "<rect x='1.6' y='13.8' width='11' height='12.4' rx='1.8' fill='#f6f6f9' stroke='#3c3c41' stroke-width='1.5'/>"
          ) +
            E("<path d='M1.6 21.3h11' stroke='#3c3c41' stroke-width='1.3'/>") +
            E("<path d='M3.1 21.3h8v3.3a1.6 1.6 0 0 1-1.6 1.6H4.7a1.6 1.6 0 0 1-1.6-1.6z' fill='#d7d7de'/>")
        ),
        7,
        26
      );
    }
    if (mode === 'note') {
      /* a card to hang under the paragraph — not a pen: nothing is drawn with it */
      const ink = encodeURIComponent(c || '#2f5bd0');
      return mkSvgCursor(
        E("<rect x='3.2' y='4.2' width='19.6' height='17.6' rx='3' fill='#fff' stroke='#3c3c41' stroke-width='1.7'/>") +
          "%3Cpath d='M7 9.6h12M7 13.2h12M7 16.8h7' stroke='" +
          ink +
          "'" +
          E(" stroke-width='1.7' stroke-linecap='round'/>"),
        4,
        5
      );
    }
    if (mode === 'copy') {
      /* two cards, the way copying is drawn everywhere, on a beam that shows
       where the words will be taken from */
      return mkSvgCursor(
        E("<path d='M5 3.4v17.2M2.2 3.4h5.6M2.2 20.6h5.6' stroke='#fff' stroke-width='3.6' stroke-linecap='round'/>") +
          E(
            "<path d='M5 3.4v17.2M2.2 3.4h5.6M2.2 20.6h5.6' stroke='#25252a' stroke-width='1.7' stroke-linecap='round'/>"
          ) +
          E(
            "<rect x='14' y='8.4' width='11.4' height='13.6' rx='2.2' fill='#fff' stroke='#3c3c41' stroke-width='1.6'/>"
          ) +
          E(
            "<rect x='10.4' y='12.4' width='11.4' height='13.6' rx='2.2' fill='#fff' stroke='#3c3c41' stroke-width='1.6'/>"
          ) +
          E("<path d='M13.2 17h6M13.2 20.4h4' stroke='#6b6b73' stroke-width='1.4' stroke-linecap='round'/>"),
        5,
        12
      );
    }
    return '';
  }
  const MK_CURSOR = { ins: 'text' };
  /* the cursor, the selection colour and the lit buttons all say the same thing:
   this is what is in your hand right now */
  function mkPaintMode() {
    const sh = byId('sheets');
    sh.style.cursor = (mkMode ? (MK_CURSOR as Dict)[mkMode] : '') || mkToolCursor(mkMode, mkTool.c);
    const p = mkRgb(mkTool.c);
    document.documentElement.style.setProperty(
      '--selc',
      mkMode === 'mark' ? 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',.5)' : 'rgba(0,122,255,.22)'
    );
    mkRail.querySelectorAll<HTMLElement>('[data-mode]').forEach(function (b) {
      b.classList.toggle('on', !!mkMode && b.dataset.mode === mkMode);
    });
    mkRail.querySelectorAll<HTMLElement>('[data-s]').forEach(function (b) {
      b.classList.toggle('on', mkMode === 'mark' && b.dataset.s === mkTool.s);
      b.title = T(b.dataset.s as string);
    });
    byQuery('[data-mode="ins"]').title = T('ins');
    byQuery('[data-mode="note"]').title = T('addnote');
    byQuery('[data-mode="erase"]').title = T('erase');
    byQuery('[data-mode="copy"]').title = T('copy');
    mkRailInks();
  }
  /* seven inks and the gamut make eight cells — two even columns, no odd circle
   left standing in the middle */
  function mkRailInks() {
    mkInks.innerHTML =
      mkInkRow()
        .map(function (c) {
          return (
            '<span class="ink' +
            (mkMode === 'mark' && c === mkTool.c ? ' on' : '') +
            (mkPins.indexOf(c) >= 0 ? ' pin' : '') +
            '" data-c="' +
            c +
            '" style="background:' +
            c +
            '" title="' +
            esc(T('pinhint')) +
            '"></span>'
          );
        })
        .join('') +
      '<span class="ink more' +
      (mkPickBox.hidden ? '' : ' on') +
      '" id="more" title="' +
      esc(T('more')) +
      '"></span>';
  }
  function mkSetRail(v: boolean) {
    mkRailOn = v;
    mkSet('rail', v);
    if (!v) {
      mkHintLeft = 0;
      mkSet('hint', 0);
      mkHintHide();
    } /* он уже знает, где они */
    if (!v) {
      mkMode = null;
      mkBubClose();
    }
    mkRail.style.display = v ? '' : 'none';
    document.body.classList.toggle('railon', v);
    /* whoever needs to leave room for the rail needs its width, and only the rail
     knows it — the buttons are wider on a finger device */
    if (v) document.documentElement.style.setProperty('--railw', mkRail.offsetWidth + 10 + 'px');
    byId('mk-rail').classList.toggle('on', v);
    mkPaintMode();
    if (v) {
      mkRailEdgeCalc();
      mkLinger(2400);
    } else mkCall(false);
    mkToast(T(v ? 'railshown' : 'railhid'));
  }
  function mkSetMode(m: string | null) {
    if (!mkRailOn) return;
    mkMode = mkMode === m ? null : m;
    if (mkMode !== 'mark') mkPickBox.hidden = true;
    mkBubClose();
    mkPaintMode();
  }
  /* a type button takes the marker; pressing the same one again puts it down */
  /* A tap on a button drops the selection before the click is delivered, so the
   last live one is kept aside: pressing a tool then paints what the reader had
   already chosen, instead of quietly swallowing it. */
  let mkLastSel: Range | null = null,
    mkLastSelAt = 0;
  document.addEventListener('selectionchange', function () {
    const s = window.getSelection()!;
    if (!s.rangeCount || s.isCollapsed) return;
    const r = s.getRangeAt(0);
    const h =
      r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    if (asElem(h)?.closest('.page[data-les]') && !asElem(h)?.closest('.myins,.mynote')) {
      mkLastSel = r.cloneRange();
      mkLastSelAt = Date.now();
    }
  });
  function mkPending() {
    const s = window.getSelection()!;
    if (s.rangeCount && !s.isCollapsed) {
      const r = s.getRangeAt(0);
      const h =
        r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
      if (asElem(h)?.closest('.page[data-les]')) return r.cloneRange();
    }
    if (mkLastSel && Date.now() - mkLastSelAt < 4000 && mkLastSel.startContainer.isConnected && !mkLastSel.collapsed)
      return mkLastSel.cloneRange();
    return null;
  }
  function mkUseSelection(c: string, y: string) {
    const r = mkPending();
    if (!r) return false;
    mkPaint(r, c, y);
    mkLastSel = null;
    const s = window.getSelection()!;
    if (s.removeAllRanges) s.removeAllRanges();
    return true;
  }
  function mkTakeStyle(y: string) {
    if (!mkRailOn) return;
    if (mkGroup && mkGroup.length) {
      mkApply(mkTool.c, y);
      mkTool.s = y;
      mkSet('pen', mkTool);
      mkPaintMode();
      return;
    }
    /* something is already chosen on the page — paint that, and keep the tool */
    if (mkUseSelection(mkTool.c, y)) {
      mkTool.s = y;
      mkSet('pen', mkTool);
      mkMode = 'mark';
      mkPaintMode();
      mkLinger();
      return;
    }
    if (mkMode === 'mark' && mkTool.s === y) mkMode = null;
    else {
      mkTool.s = y;
      mkSet('pen', mkTool);
      mkMode = 'mark';
    }
    mkPaintMode();
  }
  /* a colour never puts the tool down — it only changes what it writes with */
  function mkTakeColour(c: string) {
    if (mkNoteFocused && document.body.contains(mkNoteFocused)) {
      /* a note is open — colour it */
      mkNoteTint(mkNoteFocused, c);
      mkStore();
      return;
    }
    if (mkGroup && mkGroup.length) {
      mkApply(c, mkTool.s);
      return;
    }
    if (mkUseSelection(c, mkTool.s)) {
      mkRemember(c, mkTool.s);
      mkMode = 'mark';
      mkPaintMode();
      mkLinger();
      return;
    }
    mkRemember(c, mkTool.s);
    mkMode = 'mark';
    mkPaintMode();
  }
  /* two fingers of hint: a double click on a desktop, a long press on a screen */
  mkRail.addEventListener('dblclick', function (e) {
    const i = (e.target as HTMLElement).closest<HTMLElement>('.inks [data-c]');
    if (i) mkPinToggle(i.dataset.c as string);
  });
  let mkHold: ReturnType<typeof setTimeout> | undefined;
  mkRail.addEventListener(
    'touchstart',
    function (e) {
      const i = asElem(e.target)?.closest<HTMLElement>('.inks [data-c]');
      if (!i) return;
      clearTimeout(mkHold);
      mkHold = setTimeout(function () {
        mkHold = undefined;
        mkPinToggle(i.dataset.c as string);
      }, 550);
    },
    { passive: true }
  );
  mkRail.addEventListener(
    'touchend',
    function () {
      clearTimeout(mkHold);
    },
    { passive: true }
  );
  mkRail.addEventListener(
    'touchmove',
    function () {
      clearTimeout(mkHold);
    },
    { passive: true }
  );
  mkRail.addEventListener('mousedown', function (e) {
    if ((e.target as HTMLElement).closest('[data-c],[data-s],[data-mode],#more'))
      e.preventDefault(); /* keep the selection */
  });
  mkRail.addEventListener('click', function (e) {
    const y = (e.target as HTMLElement).closest<HTMLElement>('[data-s]');
    if (y) return mkTakeStyle(y.dataset.s as string);
    const m = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
    if (m) return mkSetMode(m.dataset.mode as string);
    if ((e.target as HTMLElement).closest('#more')) {
      const open = mkPickBox.hidden;
      mkPickBox.hidden = !open;
      if (open) {
        mkHSV = mkHex2hsv(mkTool.c);
        mkPaintPicker();
        if (!mkMode) mkMode = 'mark';
      }
      mkPaintMode();
      return;
    }
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-c]');
    if (c) return mkTakeColour(c.dataset.c as string);
  });

  /* ——— how many marks are kept, and where ——— */
  /* The count used to sit at the foot of the rail. It is gone: a number that
   goes up while you read is a scoreboard, and nobody marks a lesson to score.
   The calls are left standing — where the marks are kept, and how to clear
   them, is now under the "Marking" label in the settings. */
  function mkChipPaint() {}
  let mkWipeArmed = false;
  function mkStoreCard() {
    mkCard(MK_STORE);
    const b = document.createElement('div');
    b.className = 'krow';
    b.style.marginTop = '14px';
    b.innerHTML =
      '<kbd id="mk-wipe" style="min-width:auto;cursor:pointer;color:#b3261e">' +
      esc(T('wipe')) +
      '</kbd>' +
      '<span>' +
      esc(T('wipehint')) +
      '</span>';
    keysPop.appendChild(b);
    mkWipeArmed = false;
    const wipeBtn = byId('mk-wipe');
    wipeBtn.onclick = function () {
      if (!mkWipeArmed) {
        mkWipeArmed = true;
        wipeBtn.textContent = T('sure');
        return;
      }
      const before = JSON.parse(JSON.stringify(MKALL));
      document.querySelectorAll<HTMLElement>('.page[data-les]').forEach(function (pg) {
        pg.querySelectorAll<HTMLElement>('mark').forEach(mkUnwrap);
        pg.querySelectorAll<HTMLElement>('.myins').forEach(function (e) {
          e.replaceWith(document.createTextNode(mkInsText(e)));
        });
        pg.querySelectorAll<HTMLElement>('.mynote').forEach(function (e) {
          e.remove();
        });
        delete MKALL[mkKey(pg)];
      });
      mkSet('pencil', MKALL);
      mkLegend();
      mkChipPaint();
      mkKeysClose();
      mkToast(T('cleared'), function () {
        MKALL = before;
        mkSet('pencil', MKALL);
        mkRestore();
        mkChipPaint();
      });
    };
  }

  /* ——— colour, picked beside the rail ——— */
  function mkHsv2hex(h: number, s: number, v: number) {
    const f = function (n: number) {
      const k = (n + h / 60) % 6,
        x = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
      return ('0' + Math.round(x * 255).toString(16)).slice(-2);
    };
    return '#' + f(5) + f(3) + f(1);
  }
  function mkHex2hsv(hex: string) {
    const p = mkRgb(hex),
      r = p[0] / 255,
      g = p[1] / 255,
      b = p[2] / 255;
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b),
      d = mx - mn;
    let h = 0;
    if (d) {
      h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return [h, mx ? d / mx : 0, mx];
  }
  let mkHSV = mkHex2hsv(mkTool.c);
  function mkPaintPicker() {
    const h = Math.round(mkHSV[0]);
    mkArea.style.background =
      'linear-gradient(to top,#000,rgba(0,0,0,0)),' + 'linear-gradient(to right,#fff,hsl(' + h + ',100%,50%))';
    (mkArea.firstElementChild as HTMLElement).style.left = mkHSV[1] * 100 + '%';
    (mkArea.firstElementChild as HTMLElement).style.top = (1 - mkHSV[2]) * 100 + '%';
    (mkHue.firstElementChild as HTMLElement).style.left = (h / 360) * 100 + '%';
  }
  /* dragging the field recolours the stroke under the hand, if there is one —
   the choice is made on the text itself, not on a swatch */
  function mkLive() {
    const hex = mkHsv2hex(mkHSV[0], mkHSV[1], mkHSV[2]);
    mkPaintPicker();
    if (mkGroup && mkGroup.length)
      mkGroup.forEach(function (m) {
        const ps = m.classList.contains('ps'),
          pe = m.classList.contains('pe');
        m.dataset.c = hex;
        mkInkTo(m, hex, m.dataset.y as string, ps, pe);
      });
    return hex;
  }
  function mkDrag(el: HTMLElement, fn: (x: number, y: number) => void) {
    const go = function (e: { clientX: number; clientY: number }) {
      const b = el.getBoundingClientRect();
      fn(
        Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)),
        Math.min(1, Math.max(0, (e.clientY - b.top) / b.height))
      );
      mkLive();
    };
    el.addEventListener('pointerdown', function (e: PointerEvent) {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      go(e);
      const mv = function (ev: PointerEvent) {
        go(ev);
      };
      const up = function () {
        el.removeEventListener('pointermove', mv);
        el.removeEventListener('pointerup', up);
        const hex = mkLive();
        mkRemember(hex, mkTool.s);
        mkMode = 'mark';
        mkStore();
        mkPickBox.hidden = true;
        mkPaintMode(); /* the colour is chosen — the gamut steps aside */
        mkUseSelection(hex, mkTool.s);
      };
      el.addEventListener('pointermove', mv);
      el.addEventListener('pointerup', up);
    });
  }
  mkDrag(mkArea, function (x, y) {
    mkHSV = [mkHSV[0], x, 1 - y];
  });
  mkDrag(mkHue, function (x) {
    mkHSV = [x * 360, mkHSV[1], mkHSV[2]];
  });

  /* ——— the bubble on a stroke already laid down ——— */
  function mkBubPlace(rect: DOMRect) {
    mkBub.classList.add('on');
    mkBub.querySelector<HTMLElement>('[data-a="erase"]')!.title = T('erase');
    /* placed in what is actually on screen: adding the scroll position put it a
     browser bar's worth away on iOS */
    const w = mkBub.offsetWidth,
      h = mkBub.offsetHeight;
    let x = rect.left + rect.width / 2 - w / 2;
    x = Math.max(10, Math.min(x, document.documentElement.clientWidth - w - 10));
    let y = rect.bottom + 9;
    if (y + h + 10 > window.innerHeight) y = Math.max(10, rect.top - h - 9);
    mkBub.style.left = Math.round(x) + 'px';
    mkBub.style.top = Math.round(y) + 'px';
  }
  function mkBubClose() {
    mkBub.classList.remove('on');
    if (mkGroup)
      mkGroup.forEach(function (m) {
        m.classList.remove('sel');
      });
    mkGroup = null;
    mkGripsHide();
  }

  /* ——— pulling a stroke by its ends ——— */
  const mkGripS = byId('gripS'),
    mkGripE = byId('gripE');
  mkGripS.className = 'grip s';
  mkGripE.className = 'grip e';
  function mkGripsHide() {
    mkGripS.classList.remove('on');
    mkGripE.classList.remove('on');
  }
  /* where a piece sits inside its block, counted in characters of the plain text */
  function mkOffsetOf(block: HTMLElement, node: Node, off: number) {
    const w = mkWalk(block);
    let n,
      acc = 0;
    while ((n = w.nextNode())) {
      if (n === node) return acc + off;
      acc += n.nodeValue!.length;
    }
    return acc;
  }
  function mkFirstText(el: Node) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    return w.nextNode();
  }
  function mkLastText(el: Node) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n,
      l = null;
    while ((n = w.nextNode())) l = n;
    return l;
  }
  function mkSpan(g: HTMLElement[]) {
    const block = g[0].parentElement?.closest<HTMLElement>('[data-k]');
    if (!block) return null;
    const a = mkFirstText(g[0]),
      b = mkLastText(g[g.length - 1]);
    if (!a || !b) return null;
    return { block: block, from: mkOffsetOf(block, a, 0), to: mkOffsetOf(block, b, b.nodeValue!.length) };
  }
  function mkGripsShow() {
    if (!mkGroup || !mkGroup.length) return mkGripsHide();
    const r1 = mkGroup[0].getClientRects()[0];
    const rs = mkGroup[mkGroup.length - 1].getClientRects();
    const r2 = rs[rs.length - 1];
    if (!r1 || !r2) return mkGripsHide();
    mkGripS.style.setProperty('--gh', Math.round(r1.height * 0.7) + 'px');
    mkGripE.style.setProperty('--gh', Math.round(r2.height * 0.7) + 'px');
    mkGripS.style.left = Math.round(r1.left - 7) + 'px';
    mkGripS.style.top = Math.round(r1.top - 16) + 'px';
    mkGripE.style.left = Math.round(r2.right - 8) + 'px';
    mkGripE.style.top = Math.round(r2.bottom + 1) + 'px';
    mkGripS.classList.add('on');
    mkGripE.classList.add('on');
  }
  /* lay the stroke again between two character offsets */
  function mkReshape(sp: MarkSpan, from: number, to: number, c: string, y: string) {
    const lo = Math.max(0, Math.min(from, to)),
      hi = Math.max(from, to);
    if (hi - lo < 1) return;
    mkQuiet = true;
    mkGroup!.forEach(mkUnwrap);
    const r = mkOffsets(sp.block, lo, hi);
    mkQuiet = false;
    if (!r) {
      mkGroup = [];
      return;
    }
    const gid = mkPaint(r, c, y);
    mkGroup = mkPieces(String(gid));
    mkGroup.forEach(function (m) {
      m.classList.add('sel');
    });
    mkGripsShow();
  }
  function mkGripDrag(e: PointerEvent, end: boolean) {
    if (!mkGroup || !mkGroup.length) return;
    e.preventDefault();
    const sp = mkSpan(mkGroup);
    if (!sp) return;
    const c = mkGroup[0].dataset.c as string,
      y = mkGroup[0].dataset.y as string;
    const anchor = end ? sp.from : sp.to;
    let last = end ? sp.to : sp.from,
      raf = 0;
    const move = function (ev: PointerEvent | TouchEvent) {
      const p = 'touches' in ev ? ev.touches[0] : ev;
      const r = mkRangeAt(p.clientX, p.clientY);
      if (!r) return;
      if (!sp.block.contains(r.startContainer)) return;
      const off = mkOffsetOf(sp.block, r.startContainer, r.startOffset);
      if (off === last) return;
      last = off;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        mkReshape(sp, anchor, last, c, y);
      });
    };
    const up = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      mkStore();
      mkGripsShow();
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
  }
  mkGripS.addEventListener('pointerdown', function (e) {
    mkGripDrag(e, false);
  });
  mkGripE.addEventListener('pointerdown', function (e) {
    mkGripDrag(e, true);
  });
  window.addEventListener(
    'scroll',
    function () {
      if (mkGroup && mkGroup.length) mkGripsShow();
    },
    { passive: true }
  );
  /* recolour the stroke that was clicked — and stay open, so the colours can be
   tried one after another */
  function mkApply(c: string, s: string) {
    if (!mkGroup || !mkGroup.length) return;
    mkGroup.forEach(function (m) {
      const ps = m.classList.contains('ps'),
        pe = m.classList.contains('pe');
      m.dataset.c = c;
      m.dataset.y = s;
      m.className = s + (ps ? ' ps' : '') + (pe ? ' pe' : '');
      mkInkTo(m, c, s, ps, pe);
    });
    mkRemember(c, s);
    mkStore();
    mkRailInks();
  }
  document.addEventListener('click', function (e) {
    if ((e.target as HTMLElement).tagName !== 'MARK' || mkMode === 'erase') return;
    mkBubClose();
    mkGroup = (e.target as HTMLElement).dataset.g
      ? mkPieces((e.target as HTMLElement).dataset.g as string)
      : [e.target as HTMLElement];
    mkGroup.forEach(function (m) {
      m.classList.add('sel');
    });
    mkCall(true);
    mkBubPlace((e.target as HTMLElement).getBoundingClientRect());
    mkGripsShow();
  });
  mkBub.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });
  mkBub.addEventListener('click', function (e) {
    if (!(e.target as HTMLElement).closest('[data-a]') || !mkGroup || !mkGroup.length) return;
    const g = mkGroup;
    mkBubClose();
    mkEraseAround(g);
  });
  /* the rail is not "somewhere else": while a stroke is picked up, pressing a
   colour or another stroke there has to reach the stroke, not the desk */
  document.addEventListener('mousedown', function (e) {
    if (!mkRail.contains(e.target as Node) && !mkPickBox.hidden) {
      mkPickBox.hidden = true;
      mkPaintMode();
    }
    if (mkBub.contains(e.target as Node) || mkRail.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).tagName === 'MARK') return;
    mkBubClose();
  });

  /* ——— the eraser takes the text clean ——— */
  function mkEraseRange(r: Range) {
    Array.from(document.querySelectorAll<HTMLElement>('mark'))
      .filter(function (m) {
        return r.intersectsNode(m);
      })
      .forEach(mkUnwrap);
    Array.from(document.querySelectorAll<HTMLElement>('.myins'))
      .filter(function (m) {
        return r.intersectsNode(m);
      })
      .forEach(function (m) {
        m.remove();
      });
    mkStore();
  }
  function mkEraseAround(g: HTMLElement[]) {
    const r = document.createRange();
    r.setStartBefore(g[0]);
    r.setEndAfter(g[g.length - 1]);
    mkEraseRange(r);
  }

  /* ——— what a finished selection does depends on the tool in hand ——— */
  const mkTouch = matchMedia('(pointer:coarse)').matches;
  function mkFromSelection(e?: Event) {
    if (mkMode !== 'mark' && mkMode !== 'erase' && mkMode !== 'copy') return;
    if (mkRail.contains(e?.target as Node) || mkBub.contains(e?.target as Node)) return;
    setTimeout(
      function () {
        const s = window.getSelection()!;
        if (!s.rangeCount || s.isCollapsed) return;
        const r = s.getRangeAt(0);
        const host =
          r.commonAncestorContainer.nodeType === 1
            ? r.commonAncestorContainer
            : r.commonAncestorContainer.parentElement;
        if (!asElem(host)?.closest('.page[data-les]')) return;
        const keep = r.cloneRange();
        s.removeAllRanges();
        if (mkMode === 'erase') mkEraseRange(keep);
        else if (mkMode === 'copy') mkCopyRange(keep);
        else mkPaint(keep, mkTool.c, mkTool.s);
        mkLinger();
      },
      mkTouch ? 120 : 0
    );
  }
  document.addEventListener('mouseup', mkFromSelection);
  document.addEventListener('touchend', mkFromSelection);

  /* copying carries the reference with it: the verse above the passage, or the
   lesson itself */
  function mkCopyRange(r: Range) {
    /* references are held together with hard spaces on the page; what leaves for
     the clipboard carries ordinary ones */
    const t = r
      .toString()
      .replace(/\u00A0/g, ' ')
      .trim();
    if (!t) return;
    let el: Node | null = r.commonAncestorContainer;
    if (el.nodeType === 3) el = el.parentElement;
    const item = asElem(el)?.closest<HTMLElement>('.vitem') || null;
    const ref =
      item && item.querySelector<HTMLElement>('.vref')
        ? item
            .querySelector<HTMLElement>('.vref')!
            .textContent.replace(/\u00A0/g, ' ')
            .trim()
        : '';
    const out = '«' + t + '»' + (ref ? ' (' + ref + ')' : '');
    if (navigator.clipboard) navigator.clipboard.writeText(out);
    mkToast(T('copied'));
  }

  /* ——— one click writes your own words exactly where you clicked ——— */
  function mkRangeAt(x: number, y: number) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) {
        const r = document.createRange();
        r.setStart(p.offsetNode, p.offset);
        r.collapse(true);
        return r;
      }
    }
    return null;
  }
  document.addEventListener('click', function (e) {
    if (!mkMode || mkMode === 'mark') return;
    if (mkRail.contains(e.target as Node) || mkBub.contains(e.target as Node)) return;
    const blk = asElem(e.target)?.closest<HTMLElement>('[data-k]');
    if (!blk || !blk.closest('.page[data-les]')) return;
    if ((e.target as HTMLElement).closest('.myins,.mynote')) return;
    if (mkMode === 'ins') {
      const r = mkRangeAt(e.clientX, e.clientY);
      if (r && blk.contains(r.startContainer)) mkInsert(r, '');
    }
    if (mkMode === 'note') {
      const host = blk.classList.contains('vtext') ? blk.closest<HTMLElement>('.vgroup') || blk : blk;
      mkNote(host, '', false, mkTool.c);
    }
    if (mkMode === 'erase' && (e.target as HTMLElement).tagName === 'MARK') {
      mkEraseAround(
        (e.target as HTMLElement).dataset.g
          ? mkPieces((e.target as HTMLElement).dataset.g as string)
          : [e.target as HTMLElement]
      );
    }
  });

  /* ——— the days down the side ———
   Seven bands make a lesson; the strip is built from what is on the page, so
   it works the same for one week and for a whole quarter of them. Clicking a
   day takes you to it; scrolling moves the mark along by itself. */
  const mkDaysEl = byId('days');
  let mkAnchors: HTMLElement[] = [];
  /* Opening a lesson puts you where you belong in it: on today, if today is one
   of its days, and at its very beginning otherwise — a lesson you turned to on
   purpose must not open halfway down because the last one was scrolled there.
   Changing the language or turning the verses on is not opening a lesson, and
   leaves the reader where he was. */
  let mkLastLes: string | null = null,
    mkKeepY = 0;
  function mkOpenToday() {
    const root = mkDaysRoot();
    const pg = root.querySelector<HTMLElement>('.page[data-les]');
    const id = scope + '/' + (pg ? pg.dataset.les : '');
    const same = mkLastLes === id;
    mkLastLes = id;
    /* `mkGoTo` takes both columns there, so today opens on today in each of them
     instead of leaving the second one standing at the title */
    const sec =
      !same && scope === 'week' && pg
        ? root.querySelector<HTMLElement>('.sec[data-d="' + ymd(new Date()) + '"]')
        : null;
    /* wait for the sheet to finish laying itself out: a place measured while the
     text is still flowing puts the reader — and the mark — on the wrong day */
    mkAfterLayout(function () {
      if (same) window.scrollTo(0, mkKeepY); /* same lesson, other language — stay put */
      else if (sec) mkGoTo(sec, false);
      else window.scrollTo(0, 0);
      mkDaysMark();
      requestAnimationFrame(mkDaysMark); /* now, and again once the frame lands */
    });
  }
  /* Run once the sheet has stopped growing. Frames are the good signal, but a
   tab in the background gets none — so a timer stands behind them, and
   whichever arrives first wins. */
  function mkAfterLayout(fn: () => void) {
    let last = -1,
      n = 0,
      done = false;
    const fire = function () {
      if (done) return;
      done = true;
      clearTimeout(tm);
      fn();
    };
    const step = function () {
      if (done) return;
      const h = document.documentElement.scrollHeight;
      if (h === last || n > 8) return fire();
      last = h;
      n++;
      requestAnimationFrame(step);
    };
    const tm = setTimeout(fire, 220);
    requestAnimationFrame(step);
  }
  /* The sheet is not always what scrolls. With the lesson in two languages each
   column is its own scroll box, and the strip of days belongs to the left one —
   it lists that column's seven days and never fourteen — but a day pressed on
   it moves BOTH columns, because standing on the same day in both is the whole
   reason for having two. */
  function mkPanes() {
    return Array.from(document.querySelectorAll<HTMLElement>('#sheets.dual .pane'));
  }
  function mkDaysRoot() {
    return mkPanes()[0] || document;
  }
  function mkDaysBuild() {
    mkAnchors = [];
    let html = '';
    const root = mkDaysRoot();
    if (scope === 'quarter') {
      root.querySelectorAll<HTMLElement>('.page[data-les]').forEach(function (pg) {
        const h = pg.querySelector<HTMLElement>('.lesson');
        if (!h) return;
        const n = (strip(h.textContent).match(/\d+/) || [''])[0];
        mkAnchors.push(pg);
        html += '<div class="dchip">' + esc(n) + '</div>';
      });
    } else {
      /* One more circle at the head of the week, and an ordinary chip in every
         respect: the pill travels to it, the strip marks it when the reader is
         at the top, and the jump flashes its target — all of that comes free
         from being a .dchip with an anchor behind it. Its anchor is the sheet,
         so it goes to the lesson's own head: the title and the memory verse. */
      const head = root.querySelector<HTMLElement>('.page[data-les]');
      if (head) {
        mkAnchors.push(head);
        html +=
          '<div class="dchip dtop" title="' +
          esc(TOTOP[lang] || TOTOP.en) +
          '"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5V4M4.2 7.8 8 4l3.8 3.8"/></svg></div>';
      }
      root.querySelectorAll<HTMLElement>('.sec[data-d]').forEach(function (sec) {
        const d = sec.querySelector<HTMLElement>('.day');
        if (!d) return;
        const short = strip(d.textContent)
          .trim()
          .split(/[\s,.]+/)[0];
        mkAnchors.push(sec);
        html += '<div class="dchip">' + esc(short) + '</div>';
      });
    }
    /* One round button above the week, and it is not a day: the strip walks
       through the days of the lesson, this goes back to its head — the title
       and the memory verse. An arrow rather than a house, because the site's
       own navigation now stands above the sheet and a house there would read
       as "the site's front page". It is deliberately not a .dchip: the day
       logic pairs chips with anchors by index, and a seventh chip with no day
       behind it would put every highlight one place out. */
    mkDaysEl.innerHTML = mkAnchors.length > 1 ? '<i class="dpill"><b></b></i>' + html : '';
    mkDaysEl.classList.remove('ready');
    mkDaysMark();
  }
  /* ——— writing ———
   While the reader is putting down his own words the panels get out of the way.
   On a phone this is not politeness but necessity: the keyboard takes half the
   screen, and the strip of days would otherwise sit on the very note being
   written. The class is dropped a tick late on purpose — moving the caret from
   a note to its own formatting button passes through a moment with nothing
   focused, and the panels must not flash back in between. */
  function mkWriting(on: boolean, el?: HTMLElement) {
    document.body.classList.toggle('writing', on);
    const note = on && el ? el.closest<HTMLElement>('.mynote') : null;
    if (note) mkFmtShow(note);
    else mkFmtHide();
    /* on a phone the drawer is held open by an inline transform, and no class in
     the stylesheet can argue with that — so it is closed here by hand */
    if (on && matchMedia('(max-width:700px)').matches && document.body.classList.contains('railout')) mkDrawer(false);
  }
  function mkInOwn(n: Node | null) {
    return !!asElem(n)?.closest('.mynote,.myins');
  }
  document.addEventListener('focusin', function (e) {
    const el = asElem(e.target);
    if (mkInOwn(el)) mkWriting(true, el || undefined);
  });
  document.addEventListener('focusout', function (e) {
    if (!mkInOwn(asElem(e.target))) return;
    setTimeout(function () {
      if (!mkInOwn(document.activeElement)) mkWriting(false);
    }, 0);
  });
  function mkBarH() {
    const b = document.querySelector<HTMLElement>('.bar');
    /* The bar's lower edge, not its height. On the standalone page the two were
       the same number, because the bar sat at the very top of the window. Here
       the site's navigation stands above it, so the bar is 78px lower than it
       is tall — and a threshold built from the height alone fell short of where
       a day actually lands, which made the strip mark the day before the one
       the reader had jumped to. */
    const h = (b && getComputedStyle(b).position === 'sticky' ? b.getBoundingClientRect().bottom : 0) + 10;
    document.documentElement.style.setProperty('--barh', Math.round(h) + 'px');
    return h;
  }
  /* the last word on where a day sits belongs to the browser: it knows where its
   own bars are, and on iOS that is exactly what the arithmetic gets wrong */
  function mkLand(el: HTMLElement) {
    try {
      el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
    } catch {
      el.scrollIntoView(true);
    }
  }
  let mkJumping = false,
    mkAnim = 0;
  function mkFlash(band: HTMLElement) {
    if (!band) return;
    band.classList.remove('flash');
    void band.offsetWidth;
    band.classList.add('flash');
    setTimeout(function () {
      band.classList.remove('flash');
    }, 1000);
  }
  /* The journey is driven here, frame by frame, instead of being handed to the
   browser's own smooth scrolling. Two reasons: on iOS that animation keeps
   running to a target measured before the browser's bar slid away, so the day
   lands mid-screen; and `scrollend` is not everywhere. Recomputing the goal on
   every frame makes the landing exact whatever the layout does on the way. */
  /* Ask the browser where the day would end up if it placed it itself — by
   letting it do exactly that and reading the answer — then put the page back
   the same frame, before anything is painted. Now the destination is known
   before the journey starts, so nothing has to be corrected on arrival. */
  function mkTargetFor(el: HTMLElement) {
    const back = window.scrollY;
    mkBarH();
    mkLand(el);
    const y = window.scrollY;
    window.scrollTo(0, back);
    return y;
  }
  function mkAnimTo(el: HTMLElement, after: (arrived: boolean) => void) {
    const from = window.scrollY,
      t0 = performance.now();
    const aim = mkTargetFor(el);
    const dur = Math.min(640, Math.max(240, Math.abs(aim - from) * 0.42));
    const id = ++mkAnim;
    const goal = function () {
      return aim;
    };
    const stop = function () {
      if (id === mkAnim) mkAnim++;
    };
    ['touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, stop, { passive: true, once: true });
    });
    let over = false;
    const finish = function (ok: boolean) {
      if (over) return;
      over = true;
      clearTimeout(guard);
      if (!ok) return after(false);
      /* whatever the layout did on the way, the last stretch is travelled, not
       jumped: a leftover of a few pixels is eased out over a fifth of a second */
      const rest = mkTargetFor(el) - window.scrollY;
      if (Math.abs(rest) < 2) {
        after(true);
        return;
      }
      const s0 = window.scrollY,
        r0 = performance.now(),
        rd = 200;
      const glide = function (now: number) {
        const q = Math.min(1, (now - r0) / rd),
          e = 1 - Math.pow(1 - q, 3);
        window.scrollTo(0, Math.round(s0 + rest * e));
        if (q < 1) return requestAnimationFrame(glide);
        after(true);
      };
      requestAnimationFrame(glide);
      setTimeout(function () {
        window.scrollTo(0, s0 + rest);
        after(true);
      }, rd + 120);
    };
    /* a tab with no frames — in the background, or throttled — still arrives */
    const guard = setTimeout(function () {
      if (id === mkAnim) window.scrollTo(0, goal());
      finish(id === mkAnim);
    }, dur + 140);
    const tick = function (now: number) {
      if (over) return;
      if (id !== mkAnim) return finish(false);
      const p = Math.min(1, (now - t0) / dur),
        e = 1 - Math.pow(1 - p, 3);
      const g = goal();
      window.scrollTo(0, Math.round(from + (g - from) * e));
      if (p < 1) return requestAnimationFrame(tick);
      finish(true);
    };
    requestAnimationFrame(tick);
  }
  function mkGoTo(el: HTMLElement, smooth?: boolean) {
    /* The sweep runs over what the reader is being sent to. For a day that is
       its band; for the head of the sheet it is the lesson tag, which is the
       plate the eye lands on there. */
    const band =
      el.classList && el.classList.contains('sec')
        ? el
        : el.querySelector<HTMLElement>(el.dataset.les ? '.lesson' : '.sec');
    const panes = mkPanes();
    if (panes.length) {
      /* Two columns: the same day in each. No travelling animation here — that one
       is written against `window.scrollY`, and in two columns the window is not
       what moves. The day is found in each column by its date, which is the one
       thing about a day that does not change with the language. */
      const sel = el.dataset.d
        ? '.sec[data-d="' + el.dataset.d + '"]'
        : el.dataset.les
          ? '.page[data-les="' + el.dataset.les + '"]'
          : '';
      const go = function () {
        panes.forEach(function (p) {
          const t = sel ? p.querySelector<HTMLElement>(sel) : null;
          if (t) mkLand(t);
        });
      };
      go();
      requestAnimationFrame(go);
      setTimeout(function () {
        go();
        mkDaysMark();
      }, 200);
      if (band) mkFlash(band);
      return;
    }
    const land = function () {
      mkBarH();
      mkLand(el);
    };
    if (!smooth || matchMedia('(prefers-reduced-motion:reduce)').matches) {
      land();
      requestAnimationFrame(land);
      setTimeout(function () {
        land();
        mkDaysMark();
      }, 200);
      if (band) mkFlash(band);
      return;
    }
    mkJumping = true;
    mkAnimTo(el, function (arrived: boolean) {
      mkJumping = false;
      if (!arrived) {
        mkDaysMark();
        return;
      } /* the reader took over — leave him be */
      if (band) mkFlash(band);
      mkDaysMark();
    });
  }
  /* A day the reader asked for stays the day the reader asked for.
   *
   * The strip works out the current day from where the sheet has scrolled to,
   * and that is right while the reader is scrolling. After a click it is not:
   * the jump lands the day a pixel or two above or below the line the
   * arithmetic uses — type size, zoom and rounding all move it — and the strip
   * would then quietly step back to the day before, while the day the reader
   * pressed is the one on screen. So a click pins its day, and only the
   * reader's own hand unpins it. */
  let mkPinned: number | null = null;

  function mkUnpin() {
    if (mkPinned === null) return;
    mkPinned = null;
    mkDaysMark();
  }
  /* what counts as the reader's own hand — a programmatic scroll fires none of
     these */
  window.addEventListener('wheel', mkUnpin, { passive: true });
  window.addEventListener('touchmove', mkUnpin, { passive: true });
  window.addEventListener('keydown', function (e) {
    if (/^(Arrow|Page|Home|End| )/.test(e.key)) mkUnpin();
  });

  mkDaysEl.addEventListener('click', function (e) {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.dchip');
    if (!c) return;
    const chips = Array.from(mkDaysEl.querySelectorAll<HTMLElement>('.dchip'));
    const i = chips.indexOf(c);
    const el = mkAnchors[i];
    if (!el) return;
    mkPinned = i;
    chips.forEach(function (x) {
      x.classList.toggle('on', x === c);
    });
    mkDaysMove(c);
    mkGoTo(el, true);
  });
  let mkPillAt: { x: number; y: number } | null = null;
  let mkDaysMoveT: ReturnType<typeof setTimeout> | undefined;
  function mkDaysMove(c: HTMLElement | null) {
    const p = mkDaysEl.querySelector<HTMLElement>('.dpill');
    if (!p || !c) return;
    const x = c.offsetLeft - 6,
      y = c.offsetTop - 6;
    p.style.width = c.offsetWidth + 'px';
    p.style.height = c.offsetHeight + 'px';
    mkDaysEl.classList.toggle('row', mkDaysEl.clientWidth > mkDaysEl.clientHeight);
    const moved = !mkPillAt || Math.abs(x - mkPillAt.x) > 2 || Math.abs(y - mkPillAt.y) > 2;
    const first = !mkPillAt;
    mkPillAt = { x: x, y: y };
    mkDaysEl.classList.add('ready');
    p.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (!moved || first) return;
    p.classList.remove('go');
    void p.offsetWidth;
    p.classList.add('go');
    clearTimeout(mkDaysMoveT);
    mkDaysMoveT = setTimeout(function () {
      p.classList.remove('go');
    }, 600);
  }
  function mkDaysMark() {
    if (!mkAnchors.length) return;
    const chips = Array.from(mkDaysEl.querySelectorAll<HTMLElement>('.dchip'));
    let cur = 0;
    const line = mkBarH() + 38;
    for (let i = 0; i < mkAnchors.length; i++) if (mkAnchors[i].getBoundingClientRect().top <= line) cur = i;
    /* The last day can never reach that line: there is not enough sheet left
       below it to scroll it up that far, so the strip kept marking the day
       before it — jump to Friday and Thursday lit up. At the foot of the
       document the last day is the one being read, whatever the arithmetic
       says. (Two columns scroll in their own panes, and are left alone.) */
    if (!mkPanes().length) {
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) cur = mkAnchors.length - 1;
    }
    if (mkPinned !== null && mkPinned < chips.length) cur = mkPinned;
    chips.forEach(function (c, i) {
      c.classList.toggle('on', i === cur);
    });
    mkDaysMove(chips[cur]);
  }
  let mkTick = false;
  function mkScrolled() {
    if (mkTick) return;
    mkTick = true;
    requestAnimationFrame(function () {
      mkTick = false;
      if (!mkJumping) mkDaysMark();
    });
  }
  window.addEventListener('resize', function () {
    mkDaysMark();
  });
  window.addEventListener('scroll', mkScrolled, { passive: true });
  /* a column scrolls inside itself, and the window hears nothing of it */
  function mkPanesListen() {
    mkPanes().forEach(function (p) {
      p.addEventListener('scroll', mkScrolled, { passive: true });
    });
  }

  /* ——— two ways in for someone who has never met the tools ———
   A swipe from the left edge pulls the rail out, the way a drawer opens on the
   side it lives on. And the first few times a reader selects a line with the
   tools away, a small chip offers them — after three refusals it never asks
   again. */
  const mkHintEl = byId('mkhint');
  let mkHintLeft = mkGet('hint', 3);
  function mkHintHide() {
    mkHintEl.classList.remove('on');
  }
  let mkHintShowT: ReturnType<typeof setTimeout> | undefined;
  function mkHintShow(rect: DOMRect) {
    if (mkRailOn || mkHintLeft <= 0) return;
    mkHintEl.textContent = '✎ ' + T('markit');
    mkHintEl.classList.add('on');
    const w = mkHintEl.offsetWidth,
      h = mkHintEl.offsetHeight;
    const x = Math.max(
      10,
      Math.min(rect.left + window.scrollX + rect.width / 2 - w / 2, document.documentElement.clientWidth - w - 10)
    );
    let y = rect.bottom + window.scrollY + 10;
    if (rect.bottom + h + 16 > window.innerHeight) y = rect.top + window.scrollY - h - 10;
    mkHintEl.style.left = x + 'px';
    mkHintEl.style.top = y + 'px';
    mkHintLeft--;
    mkSet('hint', mkHintLeft);
    clearTimeout(mkHintShowT);
    mkHintShowT = setTimeout(mkHintHide, 5000);
  }
  mkHintEl.onmousedown = function (e) {
    e.preventDefault();
  };
  mkHintEl.onclick = function () {
    mkHintHide();
    mkHintLeft = 0;
    mkSet('hint', 0);
    mkSetRail(true);
  };
  document.addEventListener('selectionchange', function () {
    if (window.getSelection()?.isCollapsed) mkHintHide();
  });
  function mkOffer() {
    if (mkRailOn || mkHintLeft <= 0) return;
    setTimeout(
      function () {
        const s = window.getSelection()!;
        if (!s.rangeCount || s.isCollapsed) return;
        const r = s.getRangeAt(0);
        const host =
          r.commonAncestorContainer.nodeType === 1
            ? r.commonAncestorContainer
            : r.commonAncestorContainer.parentElement;
        if (!asElem(host)?.closest('.page[data-les]')) return;
        if (String(s).trim().length < 6) return;
        mkHintShow(r.getBoundingClientRect());
      },
      mkTouch ? 140 : 0
    );
  }
  document.addEventListener('mouseup', mkOffer);
  document.addEventListener('touchend', mkOffer);

  /* ——— calling the rail, and letting it go ———
   Three things hold it out: a live selection, the hand in its margin, and its
   own parts being used (the gamut open, a stroke picked, the pointer on it).
   When none of them holds, it leaves after a breath — long enough that walking
   the mouse across the margin does not make it blink. */
  let mkCallT: ReturnType<typeof setTimeout> | undefined,
    mkNear = false,
    mkRailEdge = 0,
    mkLingerTill = 0;
  function mkRailEdgeCalc() {
    const r = mkRail.getBoundingClientRect();
    mkRailEdge = r.width ? r.right + 26 : 0;
  }
  function mkSelLive() {
    const s = window.getSelection()!;
    if (!s || !s.rangeCount || s.isCollapsed) return false;
    const r = s.getRangeAt(0);
    const h =
      r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    return !!asElem(h)?.closest('.page[data-les]');
  }
  function mkHolds() {
    if (Date.now() < mkLingerTill) return true;
    if (mkNear || mkSelLive()) return true;
    if (!mkPickBox.hidden) return true;
    if (mkGroup && mkGroup.length) return true;
    try {
      if (mkRail.matches(':hover')) return true;
    } catch {
      /* nothing to do: the page carries on without it */
    }
    return false;
  }
  function mkCall(on: boolean) {
    if (!mkRailOn) {
      document.body.classList.remove('railcall');
      return;
    }
    clearTimeout(mkCallT);
    if (on) {
      document.body.classList.add('railcall');
      return;
    }
    mkCallT = setTimeout(function () {
      if (!mkHolds()) document.body.classList.remove('railcall');
    }, 320);
  }
  /* after a mark it stays a moment: the colour is most often changed one breath
   after it was laid down, and on a finger device this is the only way back to
   the tool that is already in hand */
  /* a linger is a hold, not a timer racing other timers: clearing the selection
   after a mark asks the rail to go the same instant, and it must lose */
  let mkLingerT: ReturnType<typeof setTimeout> | undefined;
  function mkLinger(ms?: number) {
    ms = ms || 1900;
    mkLingerTill = Date.now() + ms;
    mkCall(true);
    clearTimeout(mkLingerT);
    mkLingerT = setTimeout(function () {
      mkCall(false);
    }, ms + 40);
  }
  /* a finished selection is the moment a tool is wanted — but only when the hand
   is empty: with a marker already taken the selection is painted where it lies
   (mkFromSelection) and nothing has to appear at all */
  function mkCallOnSel() {
    setTimeout(
      function () {
        if (mkSelLive()) mkCall(true);
      },
      mkTouch ? 200 : 70
    );
  }
  document.addEventListener('mouseup', mkCallOnSel);
  document.addEventListener('touchend', mkCallOnSel);
  document.addEventListener('selectionchange', function () {
    if (!mkSelLive()) mkCall(false);
  });
  /* the margin is the handle: the rect is measured once and on resize, never on
   the move itself — a pointer handler that reads layout is a stutter */
  if (!mkTouch) {
    mkRailEdgeCalc();
    window.addEventListener('resize', mkRailEdgeCalc);
    document.addEventListener(
      'pointermove',
      function (e) {
        if (!mkRailEdge) return;
        const near = e.clientX <= mkRailEdge;
        if (near === mkNear) return;
        mkNear = near;
        mkCall(near);
      },
      { passive: true }
    );
  }

  /* on a phone the rail lives in the edge: the tab pulls it out, a tap anywhere
   else puts it back, and it never starts the day taking half the screen */
  const mkTab = byId('railtab');
  function mkDrawer(open: boolean) {
    document.body.classList.toggle('railout', open);
    /* set on the element itself: on a phone the drawer must open whatever the
     cascade thinks of it */
    mkRail.style.transform = matchMedia('(max-width:700px)').matches
      ? open
        ? 'translate(0,-50%)'
        : 'translate(calc(-100% - 14px),-50%)'
      : '';
    if (open && !mkRailOn) mkSetRail(true);
    /* the sheet's left gutter is the rail measured, not guessed — see the phone
     block in the stylesheet */
    if (open) document.documentElement.style.setProperty('--railw', mkRail.offsetWidth + 10 + 'px');
  }
  matchMedia('(max-width:700px)').addEventListener('change', function () {
    mkDrawer(document.body.classList.contains('railout'));
  });
  mkDrawer(false);
  mkTab.addEventListener('click', function (e) {
    e.stopPropagation();
    mkDrawer(true);
  });
  document.addEventListener('click', function (e) {
    if (!mkTouch || !document.body.classList.contains('railout')) return;
    if (mkRail.contains(e.target as Node) || mkTab.contains(e.target as Node) || mkBub.contains(e.target as Node))
      return;
    if (mkMode) return; /* a tool is out — the reader is working */
    mkDrawer(false);
  });

  /* a swipe in from the left edge pulls the rail out */
  let mkEdge: { x: number; y: number } | null = null;
  document.addEventListener(
    'touchstart',
    function (e) {
      if (mkRailOn || e.touches.length !== 1) {
        mkEdge = null;
        return;
      }
      const t = e.touches[0];
      mkEdge = t.clientX <= 28 ? { x: t.clientX, y: t.clientY } : null;
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    function (e) {
      if (!mkEdge) return;
      const t = e.changedTouches[0],
        dx = t.clientX - mkEdge.x,
        dy = Math.abs(t.clientY - mkEdge.y);
      mkEdge = null;
      if (dx > 60 && dy < 70) {
        mkHintHide();
        mkHintLeft = 0;
        mkSet('hint', 0);
        mkSetRail(true);
        mkDrawer(true);
      }
    },
    { passive: true }
  );

  /* ——— a tap on the page, with nothing in hand, clears the room ——— */
  if (mkTouch)
    document.addEventListener('click', function (e) {
      if (mkMode) return; /* a tool is out — the tap is work */
      if (!window.getSelection()?.isCollapsed) return; /* the reader is selecting to copy */
      const t = asElem(e.target);
      if (!t) return;
      if (t.closest('#rail,#bub,.bar,.keyspop,.mtoast,a,.myins,.mynote')) return;
      if (t.tagName === 'MARK') return;
      if (!t.closest('#sheets')) return;
      document.body.classList.toggle('bare');
    });

  /* ——— keys: the same tools, without reaching for the rail ——— */
  document.addEventListener('keydown', function (e) {
    if ((e.target as HTMLElement).isContentEditable || /^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement).tagName))
      return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!mkRailOn) return; /* the rail is away: the keys are quiet too */
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') {
      mkSetMode(null);
      mkBubClose();
      mkKeysClose();
      return;
    }
    if (e.key >= '1' && e.key <= '4') {
      mkTakeStyle(MK_STYLES[+e.key - 1]);
      return;
    }
    if (k === 'e') {
      mkSetMode('erase');
      return;
    }
    if (k === 'c') {
      mkSetMode('copy');
      return;
    }
    if (k === 'i') {
      mkSetMode('ins');
      return;
    }
    if (k === 'n') {
      mkSetMode('note');
      return;
    }
    if (k === 'm') {
      if (mkMode) mkSetMode(null);
      else mkTakeStyle(mkTool.s);
      return;
    }
  });

  /* ——— the cheat sheet ——— */
  const keysPop = byId('keyspop'),
    keysBack = byId('keysback');
  function mkCard(list: [string, Dict][]) {
    let h = '';
    list.forEach(function (row) {
      const k = row[0],
        t = row[1][lang] || row[1].en;
      if (k === 'title') {
        h += '<h4>' + esc(t) + '</h4>';
        return;
      }
      if (k === 'cap' || k === 'cap2') {
        h += '<div class="cap">' + esc(t) + '</div>';
        return;
      }
      h += '<div class="krow"><kbd>' + esc(k.trim() || '✱') + '</kbd><span>' + esc(t) + '</span></div>';
    });
    keysPop.innerHTML = h;
    keysPop.hidden = false;
    keysBack.hidden = false;
    setpop.hidden = true;
    gear.classList.remove('open');
  }
  function mkKeysOpen() {
    mkCard(MK_KEYS);
  }
  function mkKeysClose() {
    keysPop.hidden = true;
    keysBack.hidden = true;
  }
  byId('mk-keys').onclick = mkKeysOpen;
  byId('mk-ver').onclick = function () {
    mkCard(MK_NEW);
  };
  keysBack.onclick = mkKeysClose;
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Escape') mkKeysClose();
    },
    true
  );

  byId('mk-rail').onclick = function () {
    mkSetRail(!mkRailOn);
  };
  byId('lab-mark').onclick = mkStoreCard;
  byId<HTMLSelectElement>('paper-sel').onchange = function () {
    setPaper(byId<HTMLSelectElement>('paper-sel').value);
  };
  mkRail.style.display = mkRailOn ? '' : 'none';
  /* the same two things `mkSetRail` publishes, so the first paint of the page is
   already the state the rest of the layout is written against */
  document.body.classList.toggle('railon', mkRailOn);
  if (mkRailOn) document.documentElement.style.setProperty('--railw', mkRail.offsetWidth + 10 + 'px');
  mkPaintMode();
  mkChipPaint();

  render();
}
