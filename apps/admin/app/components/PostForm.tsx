'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImagePicker from './ImagePicker';

type PostData = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  publishedAt: string;
  videoUrl: string;
  coverKey: string | null;
  coverAlt: string;
  thumbKey: string | null;
  isFeatured: boolean;
};

type Props = {
  id?: number;
  initial?: Partial<PostData>;
};


const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id': process.env.NEXT_PUBLIC_CF_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

function nowDatetime(): string {
  return new Date().toISOString().slice(0, 16);
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function PostForm({ id, initial = {} }: Props) {
  const router = useRouter();
  const isEdit = id !== undefined;

  const [form, setForm] = useState<PostData>({
    title:       initial.title ?? '',
    slug:        initial.slug ?? '',
    excerpt:     initial.excerpt ?? '',
    body:        initial.body ?? '',
    author:      initial.author ?? '',
    publishedAt: initial.publishedAt ?? nowDatetime(),
    videoUrl:    initial.videoUrl ?? '',
    coverKey:    initial.coverKey ?? null,
    coverAlt:    initial.coverAlt ?? '',
    thumbKey:    initial.thumbKey ?? null,
    isFeatured:  initial.isFeatured ?? false,
  });
  const [slugLocked, setSlugLocked] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PostData>(k: K, v: PostData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onTitleChange(title: string) {
    set('title', title);
    if (!slugLocked) set('slug', slugify(title));
  }

  function onSlugChange(slug: string) {
    setSlugLocked(true);
    set('slug', slug);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title:       form.title,
        slug:        form.slug,
        excerpt:     form.excerpt || null,
        body:        form.body || null,
        author:      form.author || null,
        publishedAt: form.publishedAt || null,
        videoUrl:    form.videoUrl || null,
        coverKey:    form.coverKey,
        coverAlt:    form.coverAlt || null,
        thumbKey:    form.thumbKey,
        isFeatured:  form.isFeatured,
      };
      const res = await fetch(
        isEdit
          ? `${API}/api/v1/admin/posts/${id}`
          : `${API}/api/v1/admin/posts`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', ...adminHeaders() },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push('/posts');
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-row">
        <label>Title *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Slug *</label>
        <input
          type="text"
          required
          value={form.slug}
          onChange={(e) => onSlugChange(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Preview Text</label>
        <textarea
          rows={3}
          value={form.excerpt}
          onChange={(e) => set('excerpt', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Body</label>
        <textarea
          rows={12}
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Author</label>
        <input
          type="text"
          value={form.author}
          onChange={(e) => set('author', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Published at</label>
        <input
          type="datetime-local"
          value={form.publishedAt}
          onChange={(e) => set('publishedAt', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Video URL</label>
        <input
          type="url"
          value={form.videoUrl}
          onChange={(e) => set('videoUrl', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>Cover image (hero background)</label>
        <ImagePicker
          value={form.coverKey}
          onChange={(key) => set('coverKey', key)}
        />
      </div>

      <div className="form-row">
        <label>Thumbnail (strip card preview)</label>
        <ImagePicker
          value={form.thumbKey}
          onChange={(key) => set('thumbKey', key)}
        />
      </div>

      <div className="form-row">
        <label>Cover alt text</label>
        <input
          type="text"
          value={form.coverAlt}
          onChange={(e) => set('coverAlt', e.target.value)}
        />
      </div>

      <div className="form-row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => set('isFeatured', e.target.checked)}
          />
          Featured
        </label>
      </div>

      {error && <div className="state-error" style={{ padding: '8px 0' }}>{error}</div>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create post'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push('/posts')}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
