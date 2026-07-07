'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import JSZip from 'jszip';

// ── Types ──────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  title: string;
  html: string;
  path: string; // resolved epub path, used for inter-chapter link resolution
}

interface TocEntry {
  id: string;
  title: string;
  chapterIndex: number;
}

type Phase = 'downloading' | 'parsing' | 'ready' | 'error';
type ReaderTheme = 'dark' | 'sepia' | 'light';
type ReaderFont = 'lora' | 'cormorant' | 'playfair' | 'inter';

const THEME_DOTS: Record<ReaderTheme, { bg: string; border: string }> = {
  dark: { bg: '#1c1c1e', border: '#c9a96e' },
  sepia: { bg: '#faf6ef', border: '#a0692a' },
  light: { bg: '#ffffff', border: '#8a8a8e' },
};

// Названия тем по языкам
const THEME_NAMES: Record<string, Record<ReaderTheme, string>> = {
  de: { dark: 'Dunkel', sepia: 'Sepia', light: 'Hell' },
  en: { dark: 'Dark', sepia: 'Sepia', light: 'Light' },
};
const THEME_LABEL: Record<string, string> = { de: 'Thema', en: 'Theme' };

const FONT_MAP: Record<ReaderFont, string> = {
  lora: "'Lora', serif",
  cormorant: "'Cormorant Garamond', serif",
  playfair: "'Playfair Display', serif",
  inter: "'Inter', sans-serif",
};

const FONT_LABELS: Record<ReaderFont, string> = {
  lora: 'Lora',
  cormorant: 'Cormorant',
  playfair: 'Playfair',
  inter: 'Inter',
};

const LH_OPTIONS = [
  { value: 1.6, label: 'Kompakt' },
  { value: 1.9, label: 'Normal' },
];

interface Props {
  epubUrl: string;
  title: string;
  author: string | null;
}

// ── Epub utilities ─────────────────────────────────────────────────────────

function resolveEpubPath(base: string, relative: string): string {
  if (relative.startsWith('/')) return relative.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of relative.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function getContainerOpfPath(xml: string): string {
  const m = xml.match(/full-path="([^"]+)"/);
  if (!m) throw new Error('No OPF path in container.xml');
  return m[1];
}

interface ManifestItem {
  href: string;
  mediaType: string;
}

interface OpfData {
  manifest: Record<string, ManifestItem>;
  spine: string[];
  ncxId: string | null;
}

function parseOpf(xml: string): OpfData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const manifest: Record<string, ManifestItem> = {};
  doc.querySelectorAll('manifest item').forEach((el) => {
    const id = el.getAttribute('id') ?? '';
    const href = decodeURIComponent(el.getAttribute('href') ?? '');
    const mediaType = el.getAttribute('media-type') ?? '';
    if (id) manifest[id] = { href, mediaType };
  });

  const spine: string[] = [];
  doc.querySelectorAll('spine itemref').forEach((el) => {
    const idref = el.getAttribute('idref') ?? '';
    if (idref && manifest[idref]) spine.push(idref);
  });

  const ncxId = doc.querySelector('spine')?.getAttribute('toc') ?? null;

  return { manifest, spine, ncxId };
}

// Returns a map of resolved epub path → chapter title from the NCX nav tree.
// Path-based lookup is required because skipped (empty) spine items would
// otherwise shift sequential index lookups.
function parseNcxTocMap(xml: string, ncxPath: string): Map<string, string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const map = new Map<string, string>();
  doc.querySelectorAll('navPoint').forEach((point) => {
    const src = point.querySelector('content')?.getAttribute('src') ?? '';
    const title = point.querySelector('navLabel text')?.textContent?.trim() ?? '';
    if (src && title) {
      const resolved = resolveEpubPath(ncxPath, src.split('#')[0]);
      map.set(resolved, title);
    }
  });
  return map;
}

function extractBodyHtml(raw: string): string {
  const m = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = m ? m[1] : raw;
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  content = content.replace(/<link[^>]*>/gi, '');
  return content.trim();
}

function hasVisibleText(html: string): boolean {
  // Strip tags and common HTML entities, then check for non-whitespace
  const text = html.replace(/<[^>]+>/g, '').replace(/&[a-zA-Z0-9#]+;/g, ' ');
  return text.trim().length > 0;
}

function getHtmlTitle(raw: string): string {
  return raw.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? '';
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── Highlight helpers ──────────────────────────────────────────────────────

interface HighlightRecord {
  start: number;
  end: number;
  color: string;
}

function getCharOffset(root: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walk.nextNode())) {
    if (node === targetNode) return offset + targetOffset;
    offset += node.textContent?.length ?? 0;
  }
  return -1; // нода не найдена в поддереве
}

function getNodeAtCharOffset(root: Node, charOffset: number): { node: Text; offset: number } | null {
  let offset = 0;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walk.nextNode())) {
    const len = node.textContent?.length ?? 0;
    if (offset + len >= charOffset) return { node: node as Text, offset: charOffset - offset };
    offset += len;
  }
  return null;
}

// Теги, которые считаются блочными — выделение через них создаёт невалидный HTML
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD', 'TH']);

/** Находит ближайший блочный предок ноды */
function getBlockAncestor(node: Node): Element | null {
  let n: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  while (n) {
    if (BLOCK_TAGS.has((n as Element).tagName)) return n as Element;
    n = (n as Element).parentElement;
  }
  return null;
}

/** Возвращает false если range охватывает несколько блочных элементов (разные абзацы) */
function rangeIsInline(range: Range): boolean {
  const startBlock = getBlockAncestor(range.startContainer);
  const endBlock = getBlockAncestor(range.endContainer);
  return startBlock === endBlock;
}

/** Возвращает true если range пересекается хотя бы с одним существующим .hl */
function rangeOverlapsHL(range: Range, container: HTMLElement): boolean {
  const spans = container.querySelectorAll('.hl');
  for (const span of spans) {
    const spanRange = document.createRange();
    spanRange.selectNodeContents(span);
    if (
      range.compareBoundaryPoints(Range.END_TO_START, spanRange) < 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, spanRange) > 0
    ) {
      return true;
    }
  }
  return false;
}

const HL_COLORS = [
  'hl-cream',
  'hl-honey',
  'hl-sage',
  'hl-mint',
  'hl-sky',
  'hl-rose',
  'hl-peach',
  'hl-periwinkle',
  'hl-lilac',
  'hl-lavender',
] as const;
type HLColor = (typeof HL_COLORS)[number];

// ── Component ──────────────────────────────────────────────────────────────

export default function EpubReader({ epubUrl, title, author }: Props) {
  const locale = useLocale();

  const [phase, setPhase] = useState<Phase>('downloading');
  const [progress, setProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setThemeState] = useState<ReaderTheme>(() => {
    const saved = localStorage.getItem('sdarm_theme') as ReaderTheme | null;
    return saved && (saved === 'dark' || saved === 'sepia' || saved === 'light') ? saved : 'dark';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem('sdarm_fs');
    return saved ? Math.max(13, Math.min(32, Number(saved))) : 26;
  });
  const [fontKey, setFontKeyState] = useState<ReaderFont>(() => {
    const saved = localStorage.getItem('sdarm_font') as ReaderFont | null;
    return saved && FONT_MAP[saved] ? saved : 'cormorant';
  });
  const [lineHeight, setLineHeightState] = useState(() => {
    const saved = localStorage.getItem('sdarm_lh');
    return saved ? Number(saved) : 1.9;
  });

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chapterTexts = useMemo(
    () => chapters.map((ch) => ch.html.replace(/<[^>]+>/g, '').replace(/&[a-zA-Z0-9#]+;/g, ' ')),
    [chapters]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery || chapterTexts.length === 0) return [];
    const MAX_RESULTS = 200;
    const q = searchQuery.toLowerCase();
    const results: { chapterIndex: number; snippet: string }[] = [];
    outer: for (let ci = 0; ci < chapterTexts.length; ci++) {
      const text = chapterTexts[ci];
      const lower = text.toLowerCase();
      let pos = 0;
      while ((pos = lower.indexOf(q, pos)) !== -1) {
        const start = Math.max(0, pos - 30);
        const end = Math.min(text.length, pos + q.length + 30);
        const snippet = (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
        results.push({ chapterIndex: ci, snippet });
        if (results.length >= MAX_RESULTS) break outer;
        pos += q.length;
      }
    }
    return results;
  }, [searchQuery, chapterTexts]);

  const contentRef = useRef<HTMLDivElement>(null);
  const settingsWrapRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const settingsEverOpenedRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const clickedHLRef = useRef<HTMLElement | null>(null);
  const [hlToolbarPos, setHlToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [hlShake, setHlShake] = useState(false);
  // retrySignal increments on manual retry to re-trigger the effect
  const [retrySignal, setRetrySignal] = useState(0);

  // Mirror theme to <html data-theme> so body bg and scrollbar also respond
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  // Close settings panel on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    function onOutside(e: MouseEvent) {
      if (settingsWrapRef.current && !settingsWrapRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [settingsOpen]);

  // Move focus into settings panel on open; restore to toggle button on close
  useEffect(() => {
    if (settingsOpen) {
      settingsEverOpenedRef.current = true;
      const panel = document.getElementById('epub-settings-panel');
      const first = panel?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    } else if (settingsEverOpenedRef.current) {
      settingsBtnRef.current?.focus();
    }
  }, [settingsOpen]);

  function setTheme(t: ReaderTheme) {
    setThemeState(t);
    localStorage.setItem('sdarm_theme', t);
  }

  function setFontSize(n: number) {
    const v = Math.max(13, Math.min(32, n));
    setFontSizeState(v);
    localStorage.setItem('sdarm_fs', String(v));
  }

  function setFont(key: ReaderFont) {
    setFontKeyState(key);
    localStorage.setItem('sdarm_font', key);
  }

  function setLineHeight(lh: number) {
    setLineHeightState(lh);
    localStorage.setItem('sdarm_lh', String(lh));
  }

  // ── Highlight functions ────────────────────────────────────────────────────

  function hlStorageKey(chIdx: number) {
    return `sdarm_highlights::${epubUrl}::${chIdx}`;
  }

  function hideHlToolbar() {
    setHlToolbarPos(null);
    savedRangeRef.current = null;
    clickedHLRef.current = null;
  }

  function saveHighlights() {
    const body = contentRef.current?.querySelector('.epub-chapter__body');
    if (!body) return;
    const spans = body.querySelectorAll<HTMLElement>('.hl');
    const records: HighlightRecord[] = [];
    spans.forEach((span) => {
      const color = Array.from(span.classList).find((c) => c.startsWith('hl-') && c !== 'hl');
      if (!color) return;
      const range = document.createRange();
      range.selectNodeContents(span);
      const start = getCharOffset(body, range.startContainer, range.startOffset);
      const end = getCharOffset(body, range.endContainer, range.endOffset);
      if (start < 0 || end < 0 || start >= end) return; // невалидный диапазон
      records.push({ start, end, color });
    });
    try {
      localStorage.setItem(hlStorageKey(currentIdx), JSON.stringify(records));
    } catch {
      // localStorage may be unavailable (private browsing) — ignore silently
    }
  }

  const restoreHighlights = useCallback(
    (chIdx: number) => {
      const body = contentRef.current?.querySelector('.epub-chapter__body');
      if (!body) return;
      let records: HighlightRecord[] = [];
      try {
        const raw = localStorage.getItem(`sdarm_highlights::${epubUrl}::${chIdx}`);
        if (raw) records = JSON.parse(raw);
      } catch {
        // corrupted localStorage value — skip restoring highlights
      }
      records
        .slice()
        .reverse()
        .forEach(({ start, end, color }) => {
          const s = getNodeAtCharOffset(body, start);
          const e = getNodeAtCharOffset(body, end);
          if (!s || !e) return;
          try {
            const range = document.createRange();
            range.setStart(s.node, s.offset);
            range.setEnd(e.node, e.offset);
            const span = document.createElement('span');
            span.className = 'hl ' + color;
            span.appendChild(range.extractContents());
            range.insertNode(span);
          } catch {
            // invalid range after DOM mutation — skip this highlight
          }
        });
    },
    [epubUrl]
  );

  function applyHL(colorClass: HLColor) {
    if (clickedHLRef.current) {
      // Re-color an existing highlight span
      clickedHLRef.current.className = 'hl ' + colorClass;
      clickedHLRef.current = null;
      hideHlToolbar();
      saveHighlights();
    } else if (savedRangeRef.current) {
      // Apply color to a fresh text selection using the saved Range
      const range = savedRangeRef.current;
      savedRangeRef.current = null;

      // Не применять если выделение перекрывает существующий .hl — иначе фрагментируется DOM
      const body = contentRef.current?.querySelector<HTMLElement>('.epub-chapter__body');
      if (body && rangeOverlapsHL(range, body)) {
        hideHlToolbar();
        return;
      }

      const span = document.createElement('span');
      span.className = 'hl ' + colorClass;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        window.getSelection()?.removeAllRanges();
      } catch {
        // range стал невалидным между выделением и кликом — игнорируем
      }
      hideHlToolbar();
      saveHighlights();
    }
  }

  function removeHL() {
    const hl = clickedHLRef.current;
    clickedHLRef.current = null; // clear before hideHlToolbar to prevent double unwrap
    if (hl) {
      const p = hl.parentNode;
      if (p) {
        while (hl.firstChild) p.insertBefore(hl.firstChild, hl);
        p.removeChild(hl);
        (p as Element).normalize?.();
      }
    }
    hideHlToolbar();
    saveHighlights();
  }

  useEffect(() => {
    savedRangeRef.current = null;
    clickedHLRef.current = null;

    async function loadEpub() {
      setHlToolbarPos(null);
      try {
        setPhase('downloading');
        setProgress(0);
        setLoadedBytes(0);
        setTotalBytes(0);

        const res = await fetch(epubUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const contentLength = Number(res.headers.get('Content-Length') ?? '0');
        setTotalBytes(contentLength);

        if (!res.body) throw new Error('Response body is null');
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          setLoadedBytes(loaded);
          if (contentLength > 0) setProgress(Math.round((loaded / contentLength) * 100));
        }

        const buf = new Uint8Array(loaded);
        let pos = 0;
        for (const chunk of chunks) {
          buf.set(chunk, pos);
          pos += chunk.length;
        }

        setPhase('parsing');

        const zip = await JSZip.loadAsync(buf);

        const containerXml = await zip.file('META-INF/container.xml')?.async('text');
        if (!containerXml) throw new Error('Missing META-INF/container.xml');
        const opfPath = getContainerOpfPath(containerXml);

        const opfXml = await zip.file(opfPath)?.async('text');
        if (!opfXml) throw new Error(`Missing OPF at ${opfPath}`);

        const { manifest, spine, ncxId } = parseOpf(opfXml);

        let ncxTocMap = new Map<string, string>();
        if (ncxId && manifest[ncxId]) {
          const ncxPath = resolveEpubPath(opfPath, manifest[ncxId].href);
          const ncxXml = await zip.file(ncxPath)?.async('text');
          if (ncxXml) ncxTocMap = parseNcxTocMap(ncxXml, ncxPath);
        }

        const result: Chapter[] = [];
        for (const idref of spine) {
          const item = manifest[idref];
          if (!item) continue;
          const path = resolveEpubPath(opfPath, item.href);
          const raw = await zip.file(path)?.async('text');
          if (!raw) continue;
          const html = extractBodyHtml(raw);
          if (!html || !hasVisibleText(html)) continue;
          const chTitle = ncxTocMap.get(path) || getHtmlTitle(raw) || String(result.length + 1);
          result.push({ id: idref, title: chTitle, html, path });
        }

        if (result.length === 0) throw new Error('Keine Kapitel gefunden');

        setChapters(result);
        setToc(result.map((ch, i) => ({ id: ch.id, title: ch.title, chapterIndex: i })));
        setPhase('ready');
      } catch (err) {
        console.error('[EpubReader]', err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setPhase('error');
      }
    }

    void loadEpub();
  }, [epubUrl, retrySignal]);

  // Scroll to top and clear highlight toolbar when chapter changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    clickedHLRef.current = null;
    savedRangeRef.current = null;
    const t = setTimeout(() => setHlToolbarPos(null), 0);
    return () => clearTimeout(t);
  }, [currentIdx]);

  // Keyboard arrow navigation (only when reader is ready)
  useEffect(() => {
    if (phase !== 'ready') return;
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') setCurrentIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIdx((i) => Math.min(chapters.length - 1, i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, chapters.length]);

  // Debounce search input → searchQuery (min 2 chars)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = searchInput.trim();
    searchDebounceRef.current = setTimeout(
      () => {
        setSearchQuery(trimmed.length >= 2 ? trimmed : '');
        setActiveSearchIdx(0);
      },
      trimmed.length < 2 ? 0 : 300
    );
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  // Text selection → toolbar (works on desktop mouse and mobile touch).
  //
  // Strategy: selectionchange fires continuously while dragging — we only cache the
  // range there (no state updates). pointerup fires on both mouse-release and
  // touchend, so we process the cached range only once the user has finished selecting.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || phase !== 'ready') return;

    let pendingRange: Range | null = null;

    function onSelectionChange() {
      if (!content) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.toString().trim().length === 0) {
        pendingRange = null;
        return;
      }
      const range = sel.getRangeAt(0).cloneRange();
      // Ignore selections outside the content pane (e.g. sidebar)
      if (!content.contains(range.commonAncestorContainer)) {
        pendingRange = null;
        return;
      }
      pendingRange = range;
    }

    function onPointerUp() {
      setTimeout(() => {
        if (!pendingRange) return;
        const range = pendingRange;
        pendingRange = null;

        // Не показывать тулбар для кросс-блочных выделений (через <p>, <div> и т.д.)
        if (!rangeIsInline(range)) {
          setHlShake(true);
          setTimeout(() => setHlShake(false), 600);
          return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return; // collapsed selection
        // Save the Range — we apply color only when the user picks one.
        // The selection stays highlighted by the browser because toolbar
        // buttons use onPointerDown + e.preventDefault() to block focus loss.
        savedRangeRef.current = range;
        clickedHLRef.current = null;
        setHlToolbarPos({
          x: rect.left + rect.width / 2,
          y: Math.max(rect.top - 130, 8),
        });
      }, 10);
    }

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [phase]);

  // Click on existing .hl span
  useEffect(() => {
    const content = contentRef.current;
    if (!content || phase !== 'ready') return;
    function onClickHL(e: MouseEvent) {
      // Allow anchor clicks inside highlights to pass through to handleContentClick
      if ((e.target as Element).closest('a')) return;
      const hl = (e.target as Element).closest<HTMLElement>('.hl');
      if (hl) {
        clickedHLRef.current = hl;
        savedRangeRef.current = null;
        setHlToolbarPos({ x: e.clientX, y: Math.max(e.clientY - 64, 8) });
        e.stopPropagation();
      }
    }
    content.addEventListener('click', onClickHL);
    return () => content.removeEventListener('click', onClickHL);
  }, [phase]);

  // Mousedown outside toolbar → hide
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const toolbar = document.getElementById('epub-hl-toolbar');
      if (toolbar?.contains(e.target as Node)) return;
      // If clicking the same non-preview highlight that's already active, let onClickHL reposition it
      const targetHL = (e.target as Element).closest<HTMLElement>('.hl');
      if (targetHL && targetHL === clickedHLRef.current) return;
      // All other cases (outside click, different .hl, new selection start) → clean up
      hideHlToolbar();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Restore highlights when chapter changes
  useEffect(() => {
    if (phase !== 'ready') return;
    const timer = setTimeout(() => restoreHighlights(currentIdx), 50);
    return () => clearTimeout(timer);
  }, [currentIdx, phase, restoreHighlights]);

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    e.preventDefault();

    // External link → new tab
    if (/^https?:\/\/|^mailto:/i.test(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    // Same-page anchor only (e.g. "#footnote-1")
    if (href.startsWith('#')) {
      contentRef.current?.querySelector(`[id="${href.slice(1)}"]`)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Inter-chapter link — resolve relative to current chapter's path
    const [filePart, anchorPart] = href.split('#');
    const resolved = resolveEpubPath(chapters[currentIdx].path, filePart);
    const targetIdx = chapters.findIndex((ch) => ch.path === resolved);
    if (targetIdx >= 0) {
      setCurrentIdx(targetIdx);
      if (anchorPart) {
        // Scroll to anchor after the chapter has rendered
        setTimeout(() => {
          contentRef.current?.querySelector(`[id="${anchorPart}"]`)?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    }
  }

  // ── Derived state (must stay above early returns for hook order) ─────────

  const chapter = chapters[currentIdx];
  const readingProgress = chapters.length > 0 ? Math.round(((currentIdx + 1) / chapters.length) * 100) : 0;

  // Inject <mark> tags for search matches in the current chapter
  const chapterHtml = useMemo(() => {
    if (!chapter) return '';
    if (!searchQuery.trim()) return chapter.html;
    const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${q})`, 'gi');
    return chapter.html.replace(/>([^<]+)</g, (full, text: string) => {
      return '>' + text.replace(re, '<mark class="epub-search-mark">$1</mark>') + '<';
    });
  }, [chapter, searchQuery]);

  function goToSearchResult(idx: number) {
    const r = searchResults[idx];
    if (!r) return;
    setActiveSearchIdx(idx);
    if (r.chapterIndex !== currentIdx) {
      setCurrentIdx(r.chapterIndex);
    }
    requestAnimationFrame(() => {
      const marks = contentRef.current?.querySelectorAll('.epub-search-mark');
      if (!marks?.length) return;
      const resultsInChapter = searchResults.filter((sr) => sr.chapterIndex === r.chapterIndex);
      const localIdx = resultsInChapter.indexOf(r);
      const mark = marks[Math.max(0, localIdx)] ?? marks[0];
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // ── Loading / error screens ──────────────────────────────────────────────

  if (phase === 'downloading' || phase === 'parsing') {
    return (
      <div className="epub-loading">
        <div className="epub-loading__inner">
          <div className="epub-loading__icon" aria-hidden="true">
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="42" height="58" rx="3" stroke="currentColor" strokeWidth="2" />
              <line x1="6" y1="4" x2="6" y2="62" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              <line x1="16" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="33" x2="40" y2="33" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="42" x2="30" y2="42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className="epub-loading__title">{title}</div>
          {author && <div className="epub-loading__author">{author}</div>}

          <div className="epub-loading__phase">
            {phase === 'downloading' ? 'Buch wird geladen\u2026' : 'Wird verarbeitet\u2026'}
          </div>

          <div className="epub-loading__bar-wrap">
            <div className="epub-loading__bar-fill" style={{ width: phase === 'parsing' ? '100%' : `${progress}%` }} />
          </div>

          {phase === 'downloading' && (
            <div className="epub-loading__bytes">
              {totalBytes > 0
                ? `${fmtBytes(loadedBytes)} / ${fmtBytes(totalBytes)} \u2014 ${progress}%`
                : fmtBytes(loadedBytes)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="epub-loading">
        <div className="epub-loading__inner">
          <div className="epub-loading__phase epub-loading__phase--error">Fehler beim Laden</div>
          {errorMsg && <div className="epub-loading__bytes">{errorMsg}</div>}
          <button className="epub-retry-btn" onClick={() => setRetrySignal((n) => n + 1)}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // ── Reader ───────────────────────────────────────────────────────────────

  return (
    <div
      className="epub-reader"
      style={
        {
          '--epub-font-size': `${fontSize}px`,
          '--epub-font-family': FONT_MAP[fontKey],
          '--epub-line-height': lineHeight,
        } as React.CSSProperties
      }
    >
      {/* Toolbar */}
      <div className="epub-toolbar">
        <div className="epub-toolbar__left">
          <button
            className="epub-icon-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={locale === 'de' ? 'Inhaltsverzeichnis umschalten' : 'Toggle table of contents'}
          >
            <svg viewBox="0 0 18 18" fill="none">
              <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="2" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="epub-breadcrumb">
            <Link href={`/${locale}`} className="epub-breadcrumb__link">
              {locale === 'de' ? 'Schätze' : 'Treasures'}
            </Link>
            <span className="epub-breadcrumb__sep" aria-hidden="true">
              ›
            </span>
            <span className="epub-breadcrumb__current">{title}</span>
          </div>
        </div>

        <div className="epub-toolbar__center">{chapter.title}</div>

        <div className="epub-toolbar__right">
          <span className="epub-chapter-pos">{readingProgress}%</span>
          <div className="epub-settings-wrap" ref={settingsWrapRef}>
            <button
              ref={settingsBtnRef}
              className={`epub-icon-btn${settingsOpen ? ' epub-icon-btn--active' : ''}`}
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              aria-controls="epub-settings-panel"
              aria-label={locale === 'de' ? 'Leseeinstellungen' : 'Reading settings'}
            >
              <svg viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M14.78 3.22l-1.42 1.42M4.64 13.36l-1.42 1.42"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {settingsOpen && (
              <div className="epub-settings" id="epub-settings-panel">
                <span className="epub-settings__label">
                  {THEME_LABEL[locale] ?? 'Thema'} — {(THEME_NAMES[locale] ?? THEME_NAMES.de)[theme]}
                </span>
                <div className="epub-theme-picker">
                  {(['dark', 'sepia', 'light'] as ReaderTheme[]).map((t) => (
                    <div
                      key={t}
                      className={`epub-theme-dot${theme === t ? ' epub-theme-dot--active' : ''}`}
                      style={{
                        background: THEME_DOTS[t].bg,
                        borderColor: theme === t ? THEME_DOTS[t].border : 'transparent',
                      }}
                      onClick={() => setTheme(t)}
                    />
                  ))}
                </div>

                <span className="epub-settings__label">Schriftgröße</span>
                <div className="epub-font-size-row">
                  <button className="epub-size-btn" onClick={() => setFontSize(fontSize - 1)} disabled={fontSize <= 13}>
                    A−
                  </button>
                  <div className="epub-font-size-val">{fontSize}px</div>
                  <button className="epub-size-btn" onClick={() => setFontSize(fontSize + 1)} disabled={fontSize >= 32}>
                    A+
                  </button>
                </div>
                <input
                  type="range"
                  className="epub-size-slider"
                  min={13}
                  max={32}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />

                <span className="epub-settings__label">Schriftart</span>
                <div className="epub-font-row">
                  {(Object.keys(FONT_MAP) as ReaderFont[]).map((key) => (
                    <button
                      key={key}
                      className={`epub-font-btn${fontKey === key ? ' epub-font-btn--active' : ''}`}
                      style={{ fontFamily: FONT_MAP[key] }}
                      onClick={() => setFont(key)}
                    >
                      {FONT_LABELS[key]}
                    </button>
                  ))}
                </div>

                <span className="epub-settings__label">Zeilenabstand</span>
                <div className="epub-lh-row">
                  {LH_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      className={`epub-lh-btn${lineHeight === value ? ' epub-lh-btn--active' : ''}`}
                      onClick={() => setLineHeight(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reading progress */}
      <div className="epub-progress" role="progressbar" aria-valuenow={readingProgress}>
        <div className="epub-progress__fill" style={{ width: `${readingProgress}%` }} />
      </div>

      {/* Layout */}
      <div className={`epub-layout${sidebarOpen ? ' epub-layout--sidebar-open' : ''}`}>
        {/* Sidebar */}
        <aside className={`epub-sidebar${sidebarOpen ? '' : ' epub-sidebar--collapsed'}`}>
          <div className="epub-sidebar__inner">
            <div className="epub-sidebar__search">
              <input
                className="epub-sidebar__search-input"
                type="search"
                placeholder={locale === 'de' ? 'Im Buch suchen…' : 'Search in book…'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    e.preventDefault();
                    goToSearchResult(
                      e.shiftKey
                        ? Math.max(0, activeSearchIdx - 1)
                        : Math.min(searchResults.length - 1, activeSearchIdx + 1)
                    );
                  }
                  if (e.key === 'Escape') {
                    setSearchInput('');
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              {searchResults.length > 0 && (
                <div className="epub-sidebar__search-nav">
                  <span className="epub-sidebar__search-count">
                    {activeSearchIdx + 1} / {searchResults.length}
                  </span>
                  <button
                    className="epub-sidebar__search-arrow"
                    disabled={activeSearchIdx === 0}
                    onClick={() => goToSearchResult(activeSearchIdx - 1)}
                    aria-label={locale === 'de' ? 'Vorheriges Ergebnis' : 'Previous result'}
                  >
                    ↑
                  </button>
                  <button
                    className="epub-sidebar__search-arrow"
                    disabled={activeSearchIdx >= searchResults.length - 1}
                    onClick={() => goToSearchResult(activeSearchIdx + 1)}
                    aria-label={locale === 'de' ? 'Nächstes Ergebnis' : 'Next result'}
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="epub-sidebar__toc-label">
                {locale === 'de' ? 'Ergebnisse' : 'Results'} ({searchResults.length})
              </div>
            ) : (
              <div className="epub-sidebar__toc-label">{locale === 'de' ? 'Kapitel' : 'Chapters'}</div>
            )}

            {searchResults.length > 0 ? (
              <div className="epub-sidebar__toc">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    className={`epub-toc-item${i === activeSearchIdx ? ' epub-toc-item--active' : ''}`}
                    onClick={() => goToSearchResult(i)}
                  >
                    <span className="epub-toc-item__num">{r.chapterIndex + 1}</span>
                    <span className="epub-toc-item__title">{r.snippet}</span>
                  </button>
                ))}
              </div>
            ) : searchInput.trim().length >= 2 ? (
              <div className="epub-sidebar__search-empty">{locale === 'de' ? 'Keine Treffer' : 'No results'}</div>
            ) : (
              <div className="epub-sidebar__toc">
                {toc.map((entry) => (
                  <button
                    key={entry.id}
                    className={`epub-toc-item${entry.chapterIndex === currentIdx ? ' epub-toc-item--active' : ''}`}
                    onClick={() => {
                      setCurrentIdx(entry.chapterIndex);
                      if (window.matchMedia('(max-width: 700px)').matches) setSidebarOpen(false);
                    }}
                  >
                    <span className="epub-toc-item__num">{entry.chapterIndex + 1}</span>
                    <span className="epub-toc-item__title">{entry.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Content pane wrapper — positions nav arrows relative to content, not full layout */}
        <div className="epub-content-pane">
          <button
            className="epub-float-btn epub-float-btn--prev"
            onClick={() => setCurrentIdx((i) => i - 1)}
            disabled={currentIdx === 0}
            aria-label={locale === 'de' ? 'Voriges Kapitel' : 'Previous chapter'}
          >
            <svg viewBox="0 0 10 16" fill="none">
              <line x1="8" y1="1" x2="2" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="2" y1="8" x2="8" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div
            className={`epub-content${hlShake ? ' epub-content--shake' : ''}`}
            ref={contentRef}
            onClick={handleContentClick}
          >
            <article className="epub-chapter">
              <div className="epub-chapter__body" dangerouslySetInnerHTML={{ __html: chapterHtml }} />
              <div style={{ height: '8vh' }} aria-hidden="true" />
            </article>
          </div>

          <button
            className="epub-float-btn epub-float-btn--next"
            onClick={() => setCurrentIdx((i) => i + 1)}
            disabled={currentIdx === chapters.length - 1}
            aria-label={locale === 'de' ? 'Nächstes Kapitel' : 'Next chapter'}
          >
            <svg viewBox="0 0 10 16" fill="none">
              <line x1="2" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="8" y1="8" x2="2" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Highlight toolbar */}
      {hlToolbarPos && (
        <div
          id="epub-hl-toolbar"
          className="hl-toolbar show"
          style={{
            left: Math.min(Math.max(hlToolbarPos.x, 130), window.innerWidth - 130),
            top: hlToolbarPos.y,
          }}
          // Prevent browser from moving focus away from the text on any interaction
          // with the toolbar — without this the selection is lost before applyHL runs.
          // onPointerDown works for both mouse and touch (iOS Safari loses selection on mousedown).
          onPointerDown={(e) => e.preventDefault()}
        >
          <div className="hl-grid">
            {HL_COLORS.map((color) => (
              <div key={color} className={`hl-color hl-c-${color.replace('hl-', '')}`} onClick={() => applyHL(color)} />
            ))}
          </div>
          <button className="hl-remove" onClick={removeHL}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
