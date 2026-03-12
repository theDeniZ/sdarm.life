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
const LIMIT = 24;

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
  const [images, setImages]   = useState<R2Image[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const pages = Math.ceil(total / LIMIT);

  async function load(p: number, unused: boolean) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API}/api/v1/admin/images`);
      url.searchParams.set('limit', String(LIMIT));
      url.searchParams.set('offset', String((p - 1) * LIMIT));
      if (unused) url.searchParams.set('unused', '1');
      const res = await fetch(url.toString(), { headers: adminHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { items: R2Image[]; total: number };
      setImages(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(page, unusedOnly); }, [page, unusedOnly]);

  function toggleUnused() {
    setPage(1);
    setUnusedOnly((u) => !u);
  }

  async function remove(img: R2Image) {
    if (!confirm(`Delete ${img.key}?`)) return;
    await fetch(`${API}/api/v1/admin/images?key=${encodeURIComponent(img.key)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    load(page, unusedOnly);
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          className={`btn-ghost${unusedOnly ? ' active' : ''}`}
          style={unusedOnly ? { borderColor: 'var(--red)', color: 'var(--red)' } : undefined}
          onClick={toggleUnused}
        >
          {unusedOnly ? '✕ Clear filter' : 'Show unused only'}
        </button>
        {!loading && <span className="pagination-total">{total} image{total !== 1 ? 's' : ''}</span>}
      </div>

      {loading ? (
        <div className="state-loading">Loading…</div>
      ) : error ? (
        <div className="state-error">{error}</div>
      ) : images.length === 0 ? (
        <div className="state-empty">{unusedOnly ? 'No unused images.' : 'No images yet.'}</div>
      ) : (
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
                    <li className="image-usage-item">{usageLabel(img.usedIn[0])}</li>
                    {img.usedIn.length > 1 && (
                      <li className="image-usage-item">+{img.usedIn.length - 1} more</li>
                    )}
                  </ul>
                ) : (
                  <span className="image-usage-unused">Unused</span>
                )}
              </div>
              <button className="btn-danger" onClick={() => remove(img)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span className="pagination-info">Page {page} / {pages}</span>
          <button className="pagination-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </>
  );
}
