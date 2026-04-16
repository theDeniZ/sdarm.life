'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateSong, createPart, updatePart, deletePart, uploadSheet, deleteSheet, fetchSong } from './repository';
import { r2url } from '../../lib/api';
import type { SongDto, SongPartDto, SongSheetDto, SongPartType } from '@sdarm/types';
import type { SongFormData } from './types';

// ── Parser ────────────────────────────────────────────────────────────────────

const HEADER_RE = /^== (.+?) \((\w+)\) ==$/;
const VALID_TYPES = new Set<string>(['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda']);

type ParsedPart = { label: string; type: SongPartType; lyrics: string };

function initText(parts: SongPartDto[]): string {
  if (parts.length === 0) return '';
  return [...parts]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => `== ${p.label} (${p.type}) ==\n${p.lyrics}`)
    .join('\n\n');
}

function parseText(text: string): ParsedPart[] {
  const lines = text.split('\n');
  const result: ParsedPart[] = [];
  let current: { label: string; type: SongPartType } | null = null;
  const buf: string[] = [];

  function flush() {
    if (current) {
      result.push({ ...current, lyrics: buf.join('\n').trim() });
      buf.length = 0;
    }
  }

  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m && VALID_TYPES.has(m[2])) {
      flush();
      current = { label: m[1], type: m[2] as SongPartType };
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { song: SongDto };

export default function SongEditor({ song }: Props) {
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // ── Metadata ────────────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<SongFormData>({
    number: song.number,
    title: song.title,
    author: song.author ?? '',
    copyright: song.copyright ?? '',
  });

  // ── Combined lyrics text ─────────────────────────────────────────────────────
  const [text, setText] = useState(() => initText(song.parts));
  const [savedParts, setSavedParts] = useState<SongPartDto[]>(song.parts);

  // ── Sheets ────────────────────────────────────────────────────────────────────
  const [sheets, setSheets] = useState<SongSheetDto[]>(song.sheets);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Save state ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveDone, setSaveDone] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const parsed = parseText(text);
  const verseCount = parsed.filter((p) => p.type === 'verse').length;

  const TOOLBAR: { label: string; type: SongPartType }[] = [
    { label: `Verse ${verseCount + 1}`, type: 'verse' },
    { label: 'Chorus', type: 'chorus' },
    { label: 'Bridge', type: 'bridge' },
    { label: 'Intro', type: 'intro' },
    { label: 'Outro', type: 'outro' },
    { label: 'Coda', type: 'coda' },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function insertSection(label: string, type: SongPartType) {
    const ta = taRef.current;
    const pos = ta?.selectionStart ?? text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const header = `${needsNewline ? '\n' : ''}\n== ${label} (${type}) ==\n`;
    const newText = before + header + after;
    setText(newText);
    setSaveDone(false);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const np = pos + header.length;
      ta.setSelectionRange(np, np);
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveDone(false);
    try {
      // Save metadata
      await updateSong(song.id, {
        number: meta.number,
        title: meta.title,
        author: meta.author || null,
        copyright: meta.copyright || null,
      });

      // Sync parts positionally: update existing, create new, delete removed
      const existing = [...savedParts].sort((a, b) => a.sortOrder - b.sortOrder);
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

      // Re-fetch to get updated IDs
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

  async function handleUploadSheet(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const sheet = await uploadSheet(song.id, file);
      setSheets((ss) => [...ss, sheet]);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDeleteSheet(sheetId: number) {
    if (!confirm('Delete this sheet?')) return;
    await deleteSheet(song.id, sheetId);
    setSheets((ss) => ss.filter((s) => s.id !== sheetId));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Metadata ── */}
      <div className="form-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr max-content 1fr',
            gap: '8px 16px',
            alignItems: 'center',
          }}
        >
          <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>#</label>
          <input
            type="number"
            required
            min={1}
            style={{ width: 80 }}
            value={meta.number}
            onChange={(e) => setMeta((m) => ({ ...m, number: Number(e.target.value) }))}
          />
          <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Title</label>
          <input
            type="text"
            required
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
          />
          <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Author</label>
          <input
            type="text"
            value={meta.author ?? ''}
            onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
          />
          <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Copyright</label>
          <input
            type="text"
            placeholder="© Author, Year"
            value={meta.copyright ?? ''}
            onChange={(e) => setMeta((m) => ({ ...m, copyright: e.target.value }))}
          />
        </div>
      </div>

      {/* ── Editor + Preview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        {/* Left: lyrics editor */}
        <div>
          {/* Section insert toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {TOOLBAR.map((item) => (
              <button
                key={item.type + item.label}
                type="button"
                className="btn-ghost"
                style={{ fontSize: 12, padding: '3px 10px' }}
                onClick={() => insertSection(item.label, item.type)}
              >
                + {item.label}
              </button>
            ))}
          </div>

          {/* Single combined textarea */}
          <textarea
            ref={taRef}
            className="part-lyrics"
            style={{ minHeight: 520, width: '100%', resize: 'vertical', fontFamily: 'monospace' }}
            value={text}
            spellCheck={false}
            placeholder={'== Verse 1 (verse) ==\nAmazing grace...\n\n== Chorus (chorus) ==\nHow sweet the sound...'}
            onChange={(e) => {
              setText(e.target.value);
              setSaveDone(false);
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Format: <code>== Label (type) ==</code> · types: <code>verse chorus bridge intro outro coda</code>
          </div>

          {/* Save controls */}
          {saveError && (
            <div className="state-error" style={{ padding: '8px 0', marginTop: 8 }}>
              {saveError}
            </div>
          )}
          {saveDone && <div style={{ padding: '8px 0', marginTop: 8, fontSize: 13, color: '#6abf69' }}>Saved.</div>}
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save all'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => router.back()}>
              Back
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            Preview
          </div>
          <div
            style={{
              background: '#faf9f7',
              border: '1px solid #e8e2d9',
              borderRadius: 8,
              padding: '20px 20px 24px',
              maxHeight: 'calc(100vh - 220px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2, color: '#1a1a1a' }}>
              #{meta.number} {meta.title || '—'}
            </div>
            {(meta.author || meta.copyright) && (
              <div style={{ fontSize: 12, color: '#888', marginBottom: 18 }}>
                {[meta.author, meta.copyright].filter(Boolean).join(' · ')}
              </div>
            )}
            {parsed.length === 0 ? (
              <p style={{ color: '#bbb', fontSize: 13 }}>No parts yet.</p>
            ) : (
              parsed.map((p, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#aaa',
                      marginBottom: 5,
                    }}
                  >
                    {p.label}
                  </div>
                  <pre
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 13,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.75,
                      color: '#2a2a2a',
                    }}
                  >
                    {p.lyrics || <span style={{ color: '#ccc', fontStyle: 'italic' }}>empty</span>}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Sheet Music ── */}
      <h2 className="section-heading" style={{ marginTop: 32 }}>
        Sheet Music
      </h2>
      <div className="form-card">
        <div className="form-row">
          <label>Upload PDF or image (jpg, png, webp, gif)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
              onChange={handleUploadSheet}
              disabled={uploading}
            />
            {uploading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Uploading…</span>}
          </div>
          {uploadError && (
            <div className="state-error" style={{ fontSize: 12, padding: '4px 0' }}>
              {uploadError}
            </div>
          )}
        </div>

        {sheets.length > 0 && (
          <div className="sheet-list">
            {[...sheets]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((sheet) => (
                <div key={sheet.id} className="sheet-row">
                  <span className="type-badge">{sheet.type}</span>
                  <a href={r2url(sheet.key) ?? '#'} target="_blank" rel="noreferrer" className="td-slug sheet-key">
                    {sheet.key.split('/').pop()}
                  </a>
                  <button type="button" className="btn-danger" onClick={() => handleDeleteSheet(sheet.id)}>
                    Delete
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
