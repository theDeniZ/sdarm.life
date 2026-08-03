'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { updateSong, createPart, updatePart, deletePart, uploadSheet, deleteSheet, fetchSong } from './repository';
import { r2url } from '../../lib/api';
import type { SongDto, SongPartDto, SongSheetDto, SongPartType } from '@sdarm/types';

const PART_TYPES: SongPartType[] = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda'];
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

  const [meta, setMeta] = useState<MetaState>({
    number: song.number,
    title: song.title,
    author: song.author ?? '',
    copyright: song.copyright ?? '',
  });
  const [metaStatus, setMetaStatus] = useState<FieldStatus>('idle');

  const [text, setText] = useState(() => initText(song.parts));
  const [savedParts, setSavedParts] = useState<SongPartDto[]>(song.parts);

  const [sheets, setSheets] = useState<SongSheetDto[]>(song.sheets);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveDone, setSaveDone] = useState(false);

  const parsed = useMemo(() => parseText(text), [text]);

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

  function wrapWithSection(type: SongPartType) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const label = defaultLabel(type, parsed);

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
      const existing = [...savedParts].sort((a, b) => a.sortOrder - b.sortOrder);

      // A save that would wipe a song is never what an editor meant. Emptying
      // the textarea is how you would clear one part, not how you would ask for
      // every part of a stored song to be deleted — and there is no undo here.
      if (parsed.length === 0 && existing.length > 0) {
        setSaveError('Refusing to delete every section. Clear them one at a time if that is really the intent.');
        return;
      }

      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        if (i < existing.length) {
          await updatePart(song.id, existing[i].id, {
            type: p.type,
            label: p.label,
            sortOrder: i,
            lyrics: p.lyrics,
          });
        } else {
          await createPart(song.id, { type: p.type, label: p.label, sortOrder: i, lyrics: p.lyrics });
        }
      }
      for (let i = parsed.length; i < existing.length; i++) {
        await deletePart(song.id, existing[i].id);
      }
      const fresh = await fetchSong(song.id);
      setSavedParts(fresh.parts);
      setText(initText(fresh.parts));
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
      {/* ── Metadata ── */}
      <div className="form-card" style={{ marginBottom: 24 }}>
        <div className="song-meta-grid">
          <div className="song-meta-field">
            <label className="song-meta-label" htmlFor="meta-number">
              Number
            </label>
            <input
              id="meta-number"
              className="song-input"
              type="number"
              required
              min={1}
              value={meta.number}
              onChange={(e) => setMeta((m) => ({ ...m, number: Number(e.target.value) }))}
            />
          </div>

          <div className="song-meta-field song-meta-field--title">
            <label className="song-meta-label" htmlFor="meta-title">
              Title
            </label>
            <input
              id="meta-title"
              className="song-input"
              type="text"
              required
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            />
          </div>

          <div className="song-meta-field song-meta-field--author">
            <label className="song-meta-label" htmlFor="meta-author">
              Author
            </label>
            <input
              id="meta-author"
              className="song-input"
              type="text"
              value={meta.author}
              onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
            />
          </div>

          <div className="song-meta-field song-meta-field--copyright">
            <label className="song-meta-label" htmlFor="meta-copyright">
              Copyright
            </label>
            <input
              id="meta-copyright"
              className="song-input"
              type="text"
              placeholder="© Author, Year"
              value={meta.copyright}
              onChange={(e) => setMeta((m) => ({ ...m, copyright: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <FieldStatusDot status={metaStatus} />
        </div>
      </div>

      {/* ── Editor + Preview ── */}
      <div className="song-editor-grid">
        {/* Left: lyrics editor + sheet music */}
        <div className="editor-pane">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <span className="toolbar-label">Section</span>
              {PART_TYPES.map((t) => (
                <button key={t} type="button" className="btn-ghost btn-sm" onClick={() => wrapWithSection(t)}>
                  {t === 'verse'
                    ? `Verse ${parsed.filter((p) => p.type === 'verse').length + 1}`
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
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
            Sections are separated by a blank line. First line of each block = label (Verse 1, Chorus, Bridge…).
          </div>

          {saveError && (
            <div className="state-error" style={{ padding: '8px 0', marginTop: 8 }}>
              {saveError}
            </div>
          )}
          {saveDone && <div style={{ padding: '8px 0', marginTop: 8, fontSize: 13, color: '#6abf69' }}>Saved.</div>}
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {/* Sheet Music */}
          <h2 className="section-heading" style={{ marginTop: 36, marginBottom: 12 }}>
            Sheet Music
          </h2>
          <label
            className={`sheet-drop${dragOver ? ' drag-over' : ''}`}
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
            <strong>{uploading ? 'Uploading…' : 'Drop files here or click to select'}</strong>
            <span className="sheet-drop-hint">PDF, JPG, PNG, WebP, GIF</span>
          </label>
          {uploadError && (
            <div className="state-error" style={{ fontSize: 12, padding: '8px 0 0' }}>
              {uploadError}
            </div>
          )}

          {sortedSheets.length > 0 && (
            <div className="sheet-grid">
              {sortedSheets.map((sheet) => {
                const href = r2url(sheet.key) ?? '#';
                return (
                  <div key={sheet.id} className="sheet-tile">
                    <a href={href} target="_blank" rel="noreferrer" style={{ display: 'contents' }}>
                      {sheet.type === 'image' ? (
                        <img src={href} alt={sheet.key} />
                      ) : (
                        <span className="sheet-tile-pdf">PDF</span>
                      )}
                    </a>
                    <button
                      type="button"
                      className="sheet-tile-del"
                      title="Delete"
                      onClick={() => handleDeleteSheet(sheet.id)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
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
                <div className="preview-part-label">{p.label}</div>
                <div className="preview-lyrics">
                  {p.lyrics ? (
                    p.lyrics.split('\n').map((line, li) => (
                      <span key={li} className="chord-line">
                        {parseChordLine(line).map((tok, ti) => (
                          <span key={ti} className="chord-token">
                            {tok.chord && <span className="chord">{tok.chord}</span>}
                            {tok.text || '\u00a0'}
                          </span>
                        ))}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>empty</span>
                  )}
                </div>
              </div>
            ))
          )}
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
