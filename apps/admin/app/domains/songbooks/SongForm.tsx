'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSong } from './repository';
import type { SongFormData } from './types';

type Props = {
  songbookId: number;
};

export default function SongForm({ songbookId }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<SongFormData>({ number: 1, title: '', author: '', copyright: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SongFormData>(k: K, v: SongFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const song = await createSong({
        songbookId,
        number: form.number,
        title: form.title,
        author: form.author || null,
        copyright: form.copyright || null,
      });
      router.push(`/songs/${song.id}`);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-row">
        <label>Number *</label>
        <input
          type="number"
          required
          min={1}
          value={form.number}
          onChange={(e) => set('number', Number(e.target.value))}
        />
      </div>

      <div className="form-row">
        <label>Title *</label>
        <input type="text" required value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="form-row">
        <label>Author</label>
        <input type="text" value={form.author ?? ''} onChange={(e) => set('author', e.target.value)} />
      </div>

      <div className="form-row">
        <label>Copyright</label>
        <input
          type="text"
          value={form.copyright ?? ''}
          placeholder="© Author, Year"
          onChange={(e) => set('copyright', e.target.value)}
        />
      </div>

      {error && (
        <div className="state-error" style={{ padding: '8px 0' }}>
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create song'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
