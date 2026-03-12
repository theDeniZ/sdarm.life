'use client';

import { useEffect, useState } from 'react';

type Usage = { type: string; label: string };

type R2Image = {
  key: string;
  size: number;
  uploaded: string;
  usedIn: Usage[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
const R2  = process.env.NEXT_PUBLIC_R2_URL  ?? 'https://images.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id':     process.env.NEXT_PUBLIC_CF_CLIENT_ID     ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usageLabel(u: Usage) {
  if (u.type === 'post_cover') return `Cover: ${u.label}`;
  if (u.type === 'post_thumb') return `Thumb: ${u.label}`;
  if (u.type === 'config') return `Config: ${u.label}`;
  return u.label;
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function ImageLibrary() {
  const [images, setImages] = useState<R2Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/admin/images`, { headers: adminHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setImages((await res.json() as R2Image[]).sort(
        (a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime(),
      ));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(img: R2Image) {
    if (!confirm(`Delete ${img.key}?`)) return;
    await fetch(`${API}/api/v1/admin/images?key=${encodeURIComponent(img.key)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    load();
  }

  if (loading) return <div className="state-loading">Loading…</div>;
  if (error)   return <div className="state-error">{error}</div>;
  if (images.length === 0) return <div className="state-empty">No images yet.</div>;

  return (
    <div className="image-library">
      {images.map((img) => (
        <div key={img.key} className="image-library-card">
          <div className="image-library-thumb">
            <img src={`${R2}/${img.key}`} alt={img.key} />
          </div>
          <div className="image-library-meta">
            <span className="image-library-key" title={img.key}>{img.key}</span>
            <span className="image-library-info">{fmtSize(img.size)} · {fmtDate(img.uploaded)}</span>
            {img.usedIn.length > 0 ? (
              <ul className="image-usage-list">
                {img.usedIn.map((u, i) => (
                  <li key={i} className="image-usage-item">{usageLabel(u)}</li>
                ))}
              </ul>
            ) : (
              <span className="image-usage-unused">Unused</span>
            )}
          </div>
          <button className="btn-danger" onClick={() => remove(img)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
