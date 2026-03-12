'use client';

import { useState } from 'react';
import Pagination from '../../components/Pagination';
import { usePaginatedList } from '../../lib/hooks';
import { R2 } from '../../lib/api';
import { fmtDate, fmtSize } from '../../lib/format';
import { fetchImages, deleteImage, LIMIT } from './repository';
import type { ImageDto } from '@sdarm/types';

type Usage = ImageDto['usedIn'][number];

function usageLabel(u: Usage) {
  if (u.type === 'post_cover') return `Cover: ${u.label}`;
  if (u.type === 'post_thumb') return `Thumb: ${u.label}`;
  if (u.type === 'config')     return `Config: ${u.label}`;
  return u.label;
}

export default function ImageLibrary() {
  const [unusedOnly, setUnusedOnly] = useState(false);
  const { items, total, page, loading, setPage, reload } = usePaginatedList<ImageDto>(
    (p) => fetchImages(p, unusedOnly),
    [unusedOnly],
  );

  function toggleUnused() {
    setPage(1);
    setUnusedOnly((u) => !u);
  }

  async function handleDelete(img: ImageDto) {
    if (!confirm(`Delete ${img.key}?`)) return;
    await deleteImage(img.key);
    reload();
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
      ) : items.length === 0 ? (
        <div className="state-empty">{unusedOnly ? 'No unused images.' : 'No images yet.'}</div>
      ) : (
        <div className="image-library">
          {items.map((img) => (
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
              <button className="btn-danger" onClick={() => handleDelete(img)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </>
  );
}
