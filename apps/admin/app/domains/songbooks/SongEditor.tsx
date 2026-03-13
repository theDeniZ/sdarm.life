'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSong, createPart, updatePart, deletePart, uploadSheet, deleteSheet } from './repository';
import { r2url } from '../../lib/api';
import type { SongDto, SongPartDto, SongSheetDto, SongPartType } from '@sdarm/types';
import type { SongFormData, PartFormData } from './types';

const PART_TYPES: SongPartType[] = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda'];

type PartState = SongPartDto & { dirty: boolean; saving: boolean };

type Props = { song: SongDto };

export default function SongEditor({ song }: Props) {
  const router = useRouter();

  // ── Metadata ───────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<SongFormData>({
    number: song.number,
    title: song.title,
    author: song.author ?? '',
    copyright: song.copyright ?? '',
  });
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // ── Parts ──────────────────────────────────────────────────────────────
  const [parts, setParts] = useState<PartState[]>(
    [...song.parts].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ ...p, dirty: false, saving: false }))
  );
  const nextSortOrder = parts.length > 0 ? Math.max(...parts.map((p) => p.sortOrder)) + 1 : 0;
  const [newPart, setNewPart] = useState<PartFormData>({
    type: 'verse',
    label: '',
    sortOrder: nextSortOrder,
    lyrics: '',
  });
  const [addingPart, setAddingPart] = useState(false);

  // ── Sheets ─────────────────────────────────────────────────────────────
  const [sheets, setSheets] = useState<SongSheetDto[]>(song.sheets);
  const [uploading, setUploading] = useState(false);

  // ── Metadata handlers ──────────────────────────────────────────────────
  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setMetaSaving(true);
    setMetaError(null);
    try {
      await updateSong(song.id, {
        number: meta.number,
        title: meta.title,
        author: meta.author || undefined,
        copyright: meta.copyright || undefined,
      });
    } catch (e) {
      setMetaError(String(e));
    } finally {
      setMetaSaving(false);
    }
  }

  // ── Part handlers ──────────────────────────────────────────────────────
  function updatePartLocal(partId: number, field: keyof SongPartDto, value: SongPartDto[keyof SongPartDto]) {
    setParts((ps) => ps.map((p) => (p.id === partId ? { ...p, [field]: value, dirty: true } : p)));
  }

  async function savePart(partId: number) {
    const part = parts.find((p) => p.id === partId)!;
    setParts((ps) => ps.map((p) => (p.id === partId ? { ...p, saving: true } : p)));
    try {
      const updated = await updatePart(song.id, partId, {
        type: part.type,
        label: part.label,
        sortOrder: part.sortOrder,
        lyrics: part.lyrics,
      });
      setParts((ps) => ps.map((p) => (p.id === partId ? { ...updated, dirty: false, saving: false } : p)));
    } catch {
      setParts((ps) => ps.map((p) => (p.id === partId ? { ...p, saving: false } : p)));
    }
  }

  async function handleDeletePart(partId: number) {
    if (!confirm('Delete this part?')) return;
    await deletePart(song.id, partId);
    setParts((ps) => ps.filter((p) => p.id !== partId));
  }

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    setAddingPart(true);
    try {
      const created = await createPart(song.id, newPart);
      setParts((ps) => [...ps, { ...created, dirty: false, saving: false }]);
      setNewPart({ type: 'verse', label: '', sortOrder: created.sortOrder + 1, lyrics: '' });
    } finally {
      setAddingPart(false);
    }
  }

  // ── Sheet handlers ─────────────────────────────────────────────────────
  async function handleUploadSheet(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sheet = await uploadSheet(song.id, file);
      setSheets((ss) => [...ss, sheet]);
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

  return (
    <div style={{ maxWidth: 760 }}>
      {/* ── Metadata ── */}
      <form className="form-card" onSubmit={saveMeta}>
        <div className="form-row">
          <label>Number *</label>
          <input
            type="number"
            required
            min={1}
            value={meta.number}
            onChange={(e) => setMeta((m) => ({ ...m, number: Number(e.target.value) }))}
          />
        </div>
        <div className="form-row">
          <label>Title *</label>
          <input
            type="text"
            required
            value={meta.title}
            onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
          />
        </div>
        <div className="form-row">
          <label>Author</label>
          <input type="text" value={meta.author} onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))} />
        </div>
        <div className="form-row">
          <label>Copyright</label>
          <input
            type="text"
            value={meta.copyright}
            placeholder="© Author, Year"
            onChange={(e) => setMeta((m) => ({ ...m, copyright: e.target.value }))}
          />
        </div>
        {metaError && (
          <div className="state-error" style={{ padding: '8px 0' }}>
            {metaError}
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={metaSaving}>
            {metaSaving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </form>

      {/* ── Parts ── */}
      <h2 className="section-heading">Parts</h2>
      <div className="form-card">
        {parts.length === 0 && (
          <p className="state-empty" style={{ padding: '8px 0' }}>
            No parts yet — add one below.
          </p>
        )}

        {parts.map((part) => (
          <div key={part.id} className="part-block">
            <div className="part-controls">
              <select
                value={part.type}
                onChange={(e) => updatePartLocal(part.id, 'type', e.target.value as SongPartType)}
              >
                {PART_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={part.label}
                placeholder="Label"
                onChange={(e) => updatePartLocal(part.id, 'label', e.target.value)}
              />
              <input
                type="number"
                value={part.sortOrder}
                title="Sort order"
                style={{ width: 56 }}
                onChange={(e) => updatePartLocal(part.id, 'sortOrder', Number(e.target.value))}
              />
              <button
                type="button"
                className={part.dirty ? 'btn-primary' : 'btn-ghost'}
                disabled={part.saving}
                onClick={() => savePart(part.id)}
              >
                {part.saving ? '…' : 'Save'}
              </button>
              <button type="button" className="btn-danger" onClick={() => handleDeletePart(part.id)}>
                Delete
              </button>
            </div>
            <textarea
              rows={5}
              className="part-lyrics"
              value={part.lyrics}
              placeholder="Lyrics — embed chords as [G]word [Am]word"
              onChange={(e) => updatePartLocal(part.id, 'lyrics', e.target.value)}
            />
          </div>
        ))}

        {/* Add Part */}
        <form onSubmit={handleAddPart} className="part-block part-block--add">
          <div className="part-controls">
            <select
              value={newPart.type}
              onChange={(e) => setNewPart((p) => ({ ...p, type: e.target.value as SongPartType }))}
            >
              {PART_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={newPart.label}
              placeholder="Label (e.g. Verse 1)"
              onChange={(e) => setNewPart((p) => ({ ...p, label: e.target.value }))}
            />
            <input
              type="number"
              value={newPart.sortOrder}
              title="Sort order"
              style={{ width: 56 }}
              onChange={(e) => setNewPart((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
            />
            <button type="submit" className="btn-primary" disabled={addingPart}>
              {addingPart ? '…' : '+ Add'}
            </button>
          </div>
          <textarea
            rows={5}
            className="part-lyrics"
            value={newPart.lyrics}
            placeholder="Lyrics — embed chords as [G]word [Am]word"
            onChange={(e) => setNewPart((p) => ({ ...p, lyrics: e.target.value }))}
          />
        </form>
      </div>

      {/* ── Sheet Music ── */}
      <h2 className="section-heading">Sheet Music</h2>
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
            {uploading && <span style={{ fontSize: 12, color: 'var(--gray)' }}>Uploading…</span>}
          </div>
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
