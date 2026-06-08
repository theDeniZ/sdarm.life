'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImagePicker from '../images/ImagePicker';
import { createTreasure, updateTreasure } from './repository';
import type { TreasureFormData } from './types';

type Props = {
  id?: number;
  initial?: Partial<TreasureFormData>;
};

export default function TreasureForm({ id, initial = {} }: Props) {
  const router = useRouter();
  const isEdit = id !== undefined;

  const [form, setForm] = useState<TreasureFormData>({
    title: initial.title ?? '',
    author: initial.author ?? '',
    description: initial.description ?? '',
    type: initial.type ?? 'book',
    language: initial.language ?? 'de',
    coverGradient: initial.coverGradient ?? '',
    coverAccentColor: initial.coverAccentColor ?? '',
    coverKey: initial.coverKey ?? null,
    isFree: initial.isFree ?? true,
    price: initial.price ?? '',
    sortOrder: initial.sortOrder ?? 0,
    epubUrl: initial.epubUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TreasureFormData>(k: K, v: TreasureFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateTreasure(id, form);
      } else {
        await createTreasure(form);
      }
      router.push('/treasures');
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-row">
        <label>Title *</label>
        <input type="text" required value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="form-row">
        <label>Author</label>
        <input type="text" value={form.author} onChange={(e) => set('author', e.target.value)} />
      </div>

      <div className="form-row">
        <label>Description</label>
        <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="form-row">
        <label>Type</label>
        <select value={form.type} onChange={(e) => set('type', e.target.value as import('@sdarm/types').TreasureType)}>
          <option value="book">Book</option>
          <option value="bible">Bible</option>
        </select>
      </div>

      <div className="form-row">
        <label>Language</label>
        <input
          type="text"
          value={form.language}
          placeholder="de, en, ru…"
          onChange={(e) => set('language', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>EPUB URL</label>
        <input type="url" value={form.epubUrl} onChange={(e) => set('epubUrl', e.target.value)} />
      </div>

      <div className="form-row">
        <label>Cover image</label>
        <ImagePicker value={form.coverKey} onChange={(key) => set('coverKey', key)} />
      </div>

      <div className="form-row">
        <label>Cover gradient</label>
        <input
          type="text"
          value={form.coverGradient}
          placeholder="linear-gradient(145deg, #1a3a2a, #0d2018)"
          onChange={(e) => set('coverGradient', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Cover accent color</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={form.coverAccentColor || '#c9a96e'}
            onChange={(e) => set('coverAccentColor', e.target.value)}
          />
          <input
            type="text"
            value={form.coverAccentColor}
            placeholder="#c9a96e"
            onChange={(e) => set('coverAccentColor', e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div className="form-row">
        <label className="checkbox-row">
          <input type="checkbox" checked={form.isFree} onChange={(e) => set('isFree', e.target.checked)} />
          Free
        </label>
      </div>

      {!form.isFree && (
        <div className="form-row">
          <label>Price</label>
          <input type="text" value={form.price} placeholder="€ 4.99" onChange={(e) => set('price', e.target.value)} />
        </div>
      )}

      <div className="form-row">
        <label>Sort order</label>
        <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
      </div>

      {error && (
        <div className="state-error" style={{ padding: '8px 0' }}>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create treasure'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.push('/treasures')}>
          Cancel
        </button>
      </div>
    </form>
  );
}
