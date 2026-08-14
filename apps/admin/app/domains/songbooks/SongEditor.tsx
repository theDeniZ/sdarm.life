'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { updateSong, createPart, updatePart, deletePart, uploadSheet, deleteSheet, fetchSong } from './repository';
import { r2url } from '../../lib/api';
import type { SongDto, SongPartDto, SongSheetDto, SongPartType, TranslationType } from '@sdarm/types';
import type { TranslationDraft } from './types';

const PART_TYPES: SongPartType[] = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda'];
const PART_LABELS: Record<SongPartType, string> = {
  verse: '', // dynamic: Verse N
  chorus: 'Chorus',
  bridge: 'Bridge',
  intro: 'Intro',
  outro: 'Outro',
  coda: 'Coda',
};
const TRANSLATION_TYPES: { value: TranslationType; label: string }[] = [
  { value: 'singable', label: 'Singable (can be sung to the melody)' },
  { value: 'reference', label: 'Reference (literal, display only)' },
];
const MAJOR_CHORDS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
const MINOR_CHORDS = ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Hm'];
const MODIFIERS: { label: string; char: string }[] = [
  { label: '♭', char: 'b' },
  { label: '♯', char: '#' },
  { label: '7', char: '7' },
];
const SAVE_DEBOUNCE = 800;

type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

type ParsedPart = { label: string; type: SongPartType; lyrics: string };

type MetaState = {
  number: number;
  title: string;
  author: string;
  copyright: string;
  language: string;
};

// ── Label ↔ type dictionary ──────────────────────────────────────────────────

/**
 * The keyword has to be followed by something that is not a letter or digit —
 * `\b` cannot do this job. `\b` is defined against ASCII `\w`, so after a
 * Cyrillic character at end-of-string there is no boundary and `/^(припев)\b/`
 * never matched "Припев" at all. Every Russian alternative in this dictionary
 * was dead code.
 */
const TYPE_PATTERNS: [SongPartType, RegExp][] = [
  ['verse', /^(verse|куплет)(?![\p{L}\p{N}])/iu],
  ['chorus', /^(chorus|refrain|refren|припев|хор)(?![\p{L}\p{N}])/iu],
  ['bridge', /^(bridge|мост)(?![\p{L}\p{N}])/iu],
  ['intro', /^intro(?![\p{L}\p{N}])/iu],
  ['outro', /^outro(?![\p{L}\p{N}])/iu],
  ['coda', /^(coda|кода)(?![\p{L}\p{N}])/iu],
];

function labelToType(label: string): SongPartType | null {
  const l = label.trim();
  for (const [type, re] of TYPE_PATTERNS) if (re.test(l)) return type;
  // Almost every verse in this database is labelled with a bare number.
  if (/^\d+[.):]?$/.test(l)) return 'verse';
  return null;
}

function defaultLabel(type: SongPartType, existing: ParsedPart[]): string {
  if (type === 'verse') {
    const n = existing.filter((p) => p.type === 'verse').length + 1;
    return `Verse ${n}`;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ── Serialize / parse the textarea ───────────────────────────────────────────

function initText(parts: SongPartDto[]): string {
  if (parts.length === 0) return '';
  return [...parts]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => `${p.label}\n${p.lyrics}`)
    .join('\n\n');
}

function partsByLang(parts: SongPartDto[]): { originals: SongPartDto[]; translations: Map<string, SongPartDto[]> } {
  const originals: SongPartDto[] = [];
  const translations = new Map<string, SongPartDto[]>();
  for (const p of [...parts].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!p.translationType || p.translationType === 'original') {
      originals.push(p);
    } else {
      const key = `${p.language ?? ''}::${p.translationType}`;
      const arr = translations.get(key) ?? [];
      arr.push(p);
      translations.set(key, arr);
    }
  }
  return { originals, translations };
}

function initTranslationDrafts(parts: SongPartDto[]): TranslationDraft[] {
  const { translations } = partsByLang(parts);
  return Array.from(translations.entries()).map(([, ps]) => ({
    language: ps[0].language ?? '',
    translationType: ps[0].translationType as TranslationType,
    text: initText(ps),
  }));
}

/**
 * One blank-line-separated block is one part, always. The first line is the
 * label because `initText` put it there — the dictionary decides the part's
 * TYPE, never whether the block is a part at all.
 *
 * It used to decide both: an unrecognised first line meant the whole block was
 * folded into the previous part's lyrics, and `handleSave` then deleted every
 * stored part past the shortened list. Since the dictionary recognised none of
 * the labels this database actually uses — bare numbers, `Refren`, `Refrain` —
 * opening any multi-part song and pressing Save merged it into one part and
 * deleted the rest. No edit required, and no error shown.
 */
function parseText(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const trimmed = block.replace(/^\n+|\n+$/g, '');
    if (!trimmed.trim()) continue;
    const lines = trimmed.split('\n');
    const label = lines[0].trim();
    parts.push({
      label,
      type: labelToType(label) ?? 'verse',
      lyrics: lines.slice(1).join('\n').trim(),
    });
  }
  return parts;
}

// Splits translation text into blocks of lines (by blank lines), without needing section headers.
// Block index matches the original section index.
function parseTranslationBlocks(text: string): string[][] {
  return text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    )
    .filter((block) => block.length > 0);
}

// ── Chord line parser (for preview) ──────────────────────────────────────────

type ChordToken = { chord: string | null; text: string };

function parseChordLine(line: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  const re = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let pendingChord: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const textBefore = line.slice(lastIndex, m.index);
    if (textBefore || pendingChord) tokens.push({ chord: pendingChord, text: textBefore });
    pendingChord = m[1];
    lastIndex = m.index + m[0].length;
  }
  const tail = line.slice(lastIndex);
  if (tail || pendingChord) tokens.push({ chord: pendingChord, text: tail });
  return tokens;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { song: SongDto };

export default function SongEditor({ song }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const { originals: initialOriginals } = partsByLang(song.parts);
  const primaryLang = initialOriginals[0]?.language ?? '';

  const [meta, setMeta] = useState<MetaState>({
    number: song.number,
    title: song.title,
    author: song.author ?? '',
    copyright: song.copyright ?? '',
    language: primaryLang,
  });
  const [translations, setTranslations] = useState<TranslationDraft[]>(() => initTranslationDrafts(song.parts));
  const [metaStatus, setMetaStatus] = useState<FieldStatus>('idle');

  const [text, setText] = useState(() => initText(initialOriginals));
  const [savedParts, setSavedParts] = useState<SongPartDto[]>(song.parts);

  const [sheets, setSheets] = useState<SongSheetDto[]>(song.sheets);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveDone, setSaveDone] = useState(false);

  const parsed = useMemo(() => parseText(text), [text]);
  const parsedTrBlocks = useMemo(() => translations.map((tr) => parseTranslationBlocks(tr.text)), [translations]);
  // Flat sequence of translation lines across all sections — matches original lyric lines globally
  const flatTrLines = useMemo(() => parsedTrBlocks.map((blocks) => blocks.flat()), [parsedTrBlocks]);

  // ── Autogrow textarea ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 240) + 'px';
  }, [text]);

  // ── Meta autosave ──────────────────────────────────────────────────────────
  const metaInitialRef = useRef(meta);
  useEffect(() => {
    if (meta === metaInitialRef.current) return;
    setMetaStatus('saving');
    const t = setTimeout(async () => {
      try {
        await updateSong(song.id, {
          number: meta.number,
          title: meta.title,
          author: meta.author || null,
          copyright: meta.copyright || null,
        });
        setMetaStatus('saved');
      } catch {
        setMetaStatus('error');
      }
    }, SAVE_DEBOUNCE);
    return () => clearTimeout(t);
  }, [meta, song.id]);

  // ── Selection-aware section insertion ──────────────────────────────────────

  function wrapWithSection(type: SongPartType, customLabel?: string) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const label = customLabel ?? defaultLabel(type, parsed);

    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);

    // Leading spacing: blank line before the label, unless we're at text start
    const leadGap = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';

    let insertion: string;
    if (start !== end) {
      insertion = `${leadGap}${label}\n${selected.trim()}`;
    } else {
      insertion = `${leadGap}${label}\n`;
    }

    const newText = before + insertion + after;
    setText(newText);
    setSaveDone(false);

    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const cursorPos = before.length + insertion.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function insertChord(chord: string) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `[${chord}]`;
    const newText = text.slice(0, start) + token + text.slice(end);
    setText(newText);
    setSaveDone(false);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function insertModifier(ch: string) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let newText: string;
    let cursor: number;
    if (start === end && text[start - 1] === ']') {
      // Cursor sits right after ']' — inject the modifier inside the bracket
      newText = text.slice(0, start - 1) + ch + text.slice(start - 1);
      cursor = start + 1;
    } else {
      newText = text.slice(0, start) + ch + text.slice(end);
      cursor = start + ch.length;
    }
    setText(newText);
    setSaveDone(false);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }

  // ── Save sections ─────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveDone(false);
    try {
      const { originals: existingOriginals } = partsByLang(savedParts);
      const lang = meta.language || null;

      // A save that would wipe a song is never what an editor meant. Emptying
      // the textarea is how you would clear one part, not how you would ask for
      // every part of a stored song to be deleted — and there is no undo here.
      if (parsed.length === 0 && existingOriginals.length > 0) {
        setSaveError('Refusing to delete every section. Clear them one at a time if that is really the intent.');
        return;
      }

      // Save original parts
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        if (i < existingOriginals.length) {
          await updatePart(song.id, existingOriginals[i].id, {
            type: p.type,
            label: p.label,
            sortOrder: i,
            lyrics: p.lyrics,
            language: lang,
            translationType: 'original',
          });
        } else {
          await createPart(song.id, {
            type: p.type,
            label: p.label,
            sortOrder: i,
            lyrics: p.lyrics,
            language: lang,
            translationType: 'original',
          });
        }
      }
      for (let i = parsed.length; i < existingOriginals.length; i++) {
        await deletePart(song.id, existingOriginals[i].id);
      }

      // Save translation parts
      const { translations: existingTranslationsMap } = partsByLang(savedParts);
      const existingTranslationGroups = Array.from(existingTranslationsMap.values());
      for (let ti = 0; ti < translations.length; ti++) {
        const draft = translations[ti];
        const tParsed = parseText(draft.text);
        const existing = existingTranslationGroups[ti] ?? [];
        for (let i = 0; i < tParsed.length; i++) {
          const p = tParsed[i];
          if (i < existing.length) {
            await updatePart(song.id, existing[i].id, {
              type: p.type,
              label: p.label,
              sortOrder: i,
              lyrics: p.lyrics,
              language: draft.language || null,
              translationType: draft.translationType,
            });
          } else {
            await createPart(song.id, {
              type: p.type,
              label: p.label,
              sortOrder: i,
              lyrics: p.lyrics,
              language: draft.language || null,
              translationType: draft.translationType,
            });
          }
        }
        for (let i = tParsed.length; i < existing.length; i++) {
          await deletePart(song.id, existing[i].id);
        }
      }
      // Delete removed translation groups
      for (let ti = translations.length; ti < existingTranslationGroups.length; ti++) {
        for (const p of existingTranslationGroups[ti]) {
          await deletePart(song.id, p.id);
        }
      }

      const fresh = await fetchSong(song.id);
      setSavedParts(fresh.parts);
      const { originals: freshOriginals } = partsByLang(fresh.parts);
      setText(initText(freshOriginals));
      setTranslations(initTranslationDrafts(fresh.parts));
      setSaveDone(true);
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  // ── Sheets ─────────────────────────────────────────────────────────────────

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const sheet = await uploadSheet(song.id, file);
        setSheets((ss) => [...ss, sheet]);
      }
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteSheet(sheetId: number) {
    if (!confirm('Delete this sheet?')) return;
    await deleteSheet(song.id, sheetId);
    setSheets((ss) => ss.filter((s) => s.id !== sheetId));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const sortedSheets = useMemo(() => [...sheets].sort((a, b) => a.sortOrder - b.sortOrder), [sheets]);

  return (
    <div>
      {/* ── Editor + Preview ── */}
      <div className="song-editor-grid">
        <div className="editor-pane">
          <div className="song-meta-bar" style={{ marginBottom: 8 }}>
            <div className="song-meta-inline">
              <input
                id="meta-number"
                className="song-input song-input--num"
                type="number"
                required
                min={1}
                title="Number"
                placeholder="#"
                value={meta.number}
                onChange={(e) => setMeta((m) => ({ ...m, number: Number(e.target.value) }))}
              />
              <input
                id="meta-title"
                className="song-input song-input--title"
                type="text"
                required
                placeholder="Title"
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              />
              <input
                id="meta-author"
                className="song-input"
                type="text"
                placeholder="Author"
                value={meta.author}
                onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
              />
              <input
                id="meta-copyright"
                className="song-input"
                type="text"
                placeholder="© Copyright"
                value={meta.copyright}
                onChange={(e) => setMeta((m) => ({ ...m, copyright: e.target.value }))}
              />
              <input
                id="meta-language"
                className="song-input song-input--lang"
                type="text"
                placeholder="Lang"
                title="Language (ru, de, en…)"
                value={meta.language}
                onChange={(e) => setMeta((m) => ({ ...m, language: e.target.value }))}
              />
              <label
                className={`sheet-drop-icon${dragOver ? ' drag-over' : ''}`}
                title={uploading ? 'Uploading…' : 'Sheet music'}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                  multiple
                  hidden
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="15"
                  height="15"
                  aria-hidden
                >
                  <path d="M8 10V2M5 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" strokeLinecap="round" />
                </svg>
              </label>
              {uploadError && (
                <span className="state-error" style={{ padding: '2px 4px', fontSize: 11 }}>
                  {uploadError}
                </span>
              )}
              {sortedSheets.map((sheet) => {
                const href = r2url(sheet.key) ?? '#';
                return (
                  <div key={sheet.id} className="sheet-chip">
                    <a href={href} target="_blank" rel="noreferrer">
                      {sheet.type === 'pdf' ? 'PDF' : 'IMG'}
                    </a>
                    <button type="button" onClick={() => handleDeleteSheet(sheet.id)} aria-label="Delete sheet">
                      ×
                    </button>
                  </div>
                );
              })}
              <FieldStatusDot status={metaStatus} />
            </div>
          </div>
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <span className="toolbar-label">Section</span>
              {PART_TYPES.map((t) => (
                <button key={t} type="button" className="btn-ghost btn-sm" onClick={() => wrapWithSection(t)}>
                  {t === 'verse' ? `Verse ${parsed.filter((p) => p.type === 'verse').length + 1}` : PART_LABELS[t]}
                </button>
              ))}
              <button type="button" className="btn-ghost btn-sm" onClick={() => wrapWithSection('chorus', 'Refrain')}>
                Refrain
              </button>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">Chord</span>
              {MAJOR_CHORDS.map((c) => (
                <button key={c} type="button" className="chord-chip" onClick={() => insertChord(c)}>
                  {c}
                </button>
              ))}
              <span className="chord-divider" />
              {MINOR_CHORDS.map((c) => (
                <button key={c} type="button" className="chord-chip" onClick={() => insertChord(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="toolbar-group">
              <span className="toolbar-label">Modify</span>
              {MODIFIERS.map((m) => (
                <button
                  key={m.char}
                  type="button"
                  className="chord-chip chord-chip--mod"
                  title={`Insert ${m.char}`}
                  onClick={() => insertModifier(m.char)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={taRef}
            className="song-text-input"
            value={text}
            spellCheck={false}
            placeholder={
              'Select a region of lyrics, then click Verse / Chorus.\n\nVerse 1\nLine of lyrics\nanother line\n\nChorus\n...'
            }
            onChange={(e) => {
              setText(e.target.value);
              setSaveDone(false);
            }}
          />

          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            Separate sections with a blank line. First line = label:{' '}
            <em>Verse 1, Verse 2, Chorus, Refrain, Bridge, Intro, Outro, Coda</em> — always write it explicitly.
          </div>

          {saveError && (
            <div className="state-error" style={{ padding: '8px 0', marginTop: 8 }}>
              {saveError}
            </div>
          )}
          {saveDone && <div className="state-saved">Saved.</div>}
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {/* Translations */}
          <div className="translations-header">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Translations
            </span>
            {translations.length === 0 && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() =>
                  setTranslations((ts) => [...ts, { language: '', translationType: 'singable', text: '' }])
                }
              >
                + Add
              </button>
            )}
          </div>
          {translations.length === 0 ? (
            <p className="translations-empty">
              No translations yet — add one to enable parallel display in the projector.
            </p>
          ) : (
            translations.map((tr, ti) => (
              <div key={ti} className="translation-entry">
                <div className="translation-entry-bar">
                  <input
                    className="song-input song-input--lang"
                    type="text"
                    placeholder="de"
                    title="Language code (de, en, ru…)"
                    value={tr.language}
                    onChange={(e) =>
                      setTranslations((ts) => ts.map((t, i) => (i === ti ? { ...t, language: e.target.value } : t)))
                    }
                  />
                  <select
                    className="song-input translation-type-select"
                    value={tr.translationType}
                    onChange={(e) =>
                      setTranslations((ts) =>
                        ts.map((t, i) => (i === ti ? { ...t, translationType: e.target.value as TranslationType } : t))
                      )
                    }
                  >
                    {TRANSLATION_TYPES.map((tt) => (
                      <option key={tt.value} value={tt.value}>
                        {tt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost btn-sm translation-remove"
                    onClick={() => setTranslations((ts) => ts.filter((_, i) => i !== ti))}
                    aria-label="Remove translation"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  className="song-text-input"
                  value={tr.text}
                  spellCheck={false}
                  placeholder={
                    'Line 1 translation\nLine 2 translation\n\nChorus line 1\nChorus line 2\n\n(Separate sections with a blank line — same order as original)'
                  }
                  style={{ minHeight: 120, resize: 'none', overflow: 'hidden' }}
                  onChange={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                    setTranslations((ts) => ts.map((t, i) => (i === ti ? { ...t, text: e.target.value } : t)));
                  }}
                />
              </div>
            ))
          )}
        </div>

        {/* Right: live preview */}
        <div className="preview-pane">
          <div className="preview-label">Preview</div>
          <div className="preview-title">
            <span className="preview-number">{meta.number}</span>
            <h2 className="preview-heading">{meta.title || '—'}</h2>
          </div>
          {(meta.author || meta.copyright) && (
            <div className="preview-byline">{[meta.author, meta.copyright].filter(Boolean).join(' · ')}</div>
          )}
          {parsed.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic' }}>
              No sections yet. Select some text and click a section button.
            </p>
          ) : (
            parsed.map((p, pi) => (
              <div key={pi} className="preview-part">
                {p.label && <div className="preview-part-label">{p.label}</div>}
                <div className="preview-lyrics">
                  {p.lyrics ? (
                    p.lyrics.split('\n').map((line, li) => {
                      const clean = line.trim();
                      if (!clean)
                        return (
                          <span key={li} className="chord-line">
                            &nbsp;
                          </span>
                        );
                      if (labelToType(clean)) {
                        return (
                          <div key={li} className="preview-part-label" style={{ marginTop: 8 }}>
                            {clean}
                          </div>
                        );
                      }
                      const tokens = parseChordLine(line);
                      const chords = tokens.filter((t) => t.chord).map((t) => t.chord!);
                      const cleanText = tokens.map((t) => t.text).join('');
                      return (
                        <span key={li} className={`chord-line${chords.length ? ' chord-line--has-chords' : ''}`}>
                          {chords.length > 0 && <span className="chord-strip">{chords.join(' ')}</span>}
                          <span className="chord-lyric">{cleanText || '\u00a0'}</span>
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>empty</span>
                  )}
                </div>
              </div>
            ))
          )}

          {translations.length > 0 &&
            parsed.length > 0 &&
            (() => {
              let globalLyricIdx = 0;
              return (
                <div className="preview-parallel">
                  <div className="preview-label" style={{ marginTop: 20 }}>
                    Parallel
                  </div>
                  {parsed.map((part, pi) => {
                    type Item =
                      | { type: 'label'; content: string }
                      | { type: 'lyric'; content: string; globalIdx: number };
                    const items: Item[] = [];
                    for (const rawLine of (part.lyrics || '').split('\n')) {
                      const cleaned = rawLine.replace(/\[([^\]]+)\]/g, '').trim();
                      if (!cleaned) continue;
                      if (labelToType(cleaned)) {
                        items.push({ type: 'label', content: cleaned });
                      } else {
                        items.push({ type: 'lyric', content: cleaned, globalIdx: globalLyricIdx++ });
                      }
                    }
                    return (
                      <div key={pi} className="preview-parallel-section">
                        {part.label && <div className="preview-part-label">{part.label}</div>}
                        {items.map((item, itemIdx) => {
                          if (item.type === 'label') {
                            return (
                              <div key={itemIdx} className="preview-part-label" style={{ marginTop: 10 }}>
                                {item.content}
                              </div>
                            );
                          }
                          const gi = item.globalIdx;
                          return (
                            <div key={itemIdx} className="preview-parallel-group">
                              <div className="preview-parallel-orig">{item.content}</div>
                              {flatTrLines.map((trLines, ti) => {
                                const trLine = trLines[gi] ?? '';
                                return (
                                  <div
                                    key={ti}
                                    className={`preview-parallel-tr${translations[ti].translationType === 'reference' ? ' preview-parallel-tr--ref' : ''}`}
                                  >
                                    {translations[ti].language && (
                                      <span className="preview-parallel-lang">{translations[ti].language}</span>
                                    )}
                                    <span>{trLine || <em style={{ color: 'var(--muted)' }}>\u2013</em>}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function FieldStatusDot({ status }: { status: FieldStatus }) {
  const label = status === 'saving' ? 'saving…' : status === 'saved' ? 'saved' : status === 'error' ? 'error' : '';
  return (
    <span className={`field-status ${status}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
