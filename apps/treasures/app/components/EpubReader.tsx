'use client';

import { useEffect, useRef, useState } from 'react';
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

  const contentRef = useRef<HTMLDivElement>(null);
  // retrySignal increments on manual retry to re-trigger the effect
  const [retrySignal, setRetrySignal] = useState(0);

  useEffect(() => {
    async function loadEpub() {
      try {
        setPhase('downloading');
        setProgress(0);
        setLoadedBytes(0);
        setTotalBytes(0);

        const res = await fetch(epubUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const contentLength = Number(res.headers.get('Content-Length') ?? '0');
        setTotalBytes(contentLength);

        const reader = res.body!.getReader();
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

  // Scroll to top when chapter changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIdx]);

  // Keyboard arrow navigation (only when reader is ready)
  useEffect(() => {
    if (phase !== 'ready') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') setCurrentIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIdx((i) => Math.min(chapters.length - 1, i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, chapters.length]);

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

  const chapter = chapters[currentIdx];
  const readingProgress = Math.round(((currentIdx + 1) / chapters.length) * 100);

  return (
    <div className="epub-reader">
      {/* Toolbar */}
      <div className="epub-toolbar">
        <div className="epub-toolbar__left">
          <button
            className="epub-icon-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Inhaltsverzeichnis umschalten"
          >
            <svg viewBox="0 0 18 18" fill="none">
              <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="2" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="epub-breadcrumb">
            <Link href={`/${locale}`} className="epub-breadcrumb__link">
              Schätze
            </Link>
            <span className="epub-breadcrumb__sep" aria-hidden="true">
              ›
            </span>
            <span className="epub-breadcrumb__current">{title}</span>
          </div>
        </div>

        <div className="epub-toolbar__center">{chapter.title}</div>

        <div className="epub-toolbar__right">
          <span className="epub-chapter-pos">
            {currentIdx + 1} / {chapters.length}
          </span>
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
            <div className="epub-sidebar__book">
              <div className="epub-sidebar__eyebrow">Buch</div>
              <div className="epub-sidebar__title">{title}</div>
              {author && <div className="epub-sidebar__author">{author}</div>}
            </div>
            <div className="epub-sidebar__toc-label">Kapitel</div>
            <div className="epub-sidebar__toc">
              {toc.map((entry) => (
                <button
                  key={entry.id}
                  className={`epub-toc-item${entry.chapterIndex === currentIdx ? ' epub-toc-item--active' : ''}`}
                  onClick={() => setCurrentIdx(entry.chapterIndex)}
                >
                  <span className="epub-toc-item__num">{entry.chapterIndex + 1}</span>
                  <span className="epub-toc-item__title">{entry.title}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Floating prev / next arrows centred in the content pane */}
        <button
          className="epub-float-btn epub-float-btn--prev"
          onClick={() => setCurrentIdx((i) => i - 1)}
          disabled={currentIdx === 0}
          aria-label="Voriges Kapitel"
        >
          <svg viewBox="0 0 10 16" fill="none">
            <line x1="8" y1="1" x2="2" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="2" y1="8" x2="8" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* Content */}
        <div className="epub-content" ref={contentRef} onClick={handleContentClick}>
          <article className="epub-chapter">
            <div className="epub-chapter__body" dangerouslySetInnerHTML={{ __html: chapter.html }} />
            <div style={{ height: '8vh' }} aria-hidden="true" />
          </article>
        </div>

        <button
          className="epub-float-btn epub-float-btn--next"
          onClick={() => setCurrentIdx((i) => i + 1)}
          disabled={currentIdx === chapters.length - 1}
          aria-label="Nächstes Kapitel"
        >
          <svg viewBox="0 0 10 16" fill="none">
            <line x1="2" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="8" y1="8" x2="2" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
