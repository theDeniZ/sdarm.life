'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImagePicker from '../images/ImagePicker';
import { createSongbook, updateSongbook } from './repository';
import type { SongbookFormData } from './types';

type Props = {
  id?: number;
  initial?: Partial<SongbookFormData>;
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function SongbookForm({ id, initial = {} }: Props) {
  const router = useRouter();
  const isEdit = id !== undefined;

  const [form, setForm] = useState<SongbookFormData>({
    title: initial.title ?? '',
    slug: initial.slug ?? '',
    language: initial.language ?? 'ru',
    description: initial.description ?? null,
    coverKey: initial.coverKey ?? null,
    sortOrder: initial.sortOrder ?? 0,
  });
  const [slugLocked, setSlugLocked] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SongbookFormData>(k: K, v: SongbookFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onTitleChange(title: string) {
    set('title', title);
    if (!slugLocked) set('slug', slugify(title));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, description: form.description || null };
      if (isEdit) {
        await updateSongbook(id, payload);
      } else {
        await createSongbook(payload);
      }
      router.push('/songbooks');
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-row">
        <label>Title *</label>
        <input type="text" required value={form.title} onChange={(e) => onTitleChange(e.target.value)} />
      </div>

      <div className="form-row">
        <label>Slug *</label>
        <input
          type="text"
          required
          value={form.slug}
          onChange={(e) => {
            setSlugLocked(true);
            set('slug', e.target.value);
          }}
        />
      </div>

      <div className="form-row">
        <label>Language</label>
        <input
          type="text"
          value={form.language}
          placeholder="ru, en, de…"
          onChange={(e) => set('language', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Description</label>
        <textarea
          rows={3}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </div>

      <div className="form-row">
        <label>Cover image</label>
        <ImagePicker value={form.coverKey} onChange={(key) => set('coverKey', key)} />
      </div>

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
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create songbook'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.push('/songbooks')}>
          Cancel
        </button>
      </div>
    </form>
  );
}
