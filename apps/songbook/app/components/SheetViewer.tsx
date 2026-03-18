'use client';

import { useState } from 'react';
import type { SongSheetDto } from '@sdarm/types';
import { r2url } from '@/app/lib/api';

export default function SheetViewer({ sheets }: { sheets: SongSheetDto[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(sheets.length > 0 ? sheets[0].id : null);

  if (sheets.length === 0) {
    return <p className="sheet-viewer__empty">No sheet music available for this song.</p>;
  }

  const active = sheets.find((s) => s.id === selectedId) ?? null;
  // URL is only resolved when a sheet is selected — actual file loads lazily on demand
  const url = active ? r2url(active.key, active.type === 'image' ? { w: 1200, q: 90 } : undefined) : null;

  return (
    <div className="sheet-viewer">
      <div className="sheet-thumbs">
        {sheets.map((sheet, i) => (
          <button
            key={sheet.id}
            className={`sheet-thumb${selectedId === sheet.id ? ' active' : ''}`}
            onClick={() => setSelectedId(sheet.id)}
          >
            {sheet.type === 'pdf' ? '📄' : '🖼'} Sheet {i + 1}
          </button>
        ))}
      </div>

      {url && active && (
        <div className="sheet-display">
          {active.type === 'pdf' ? (
            <iframe src={url} title={`Sheet music ${active.id}`} />
          ) : (
            <img src={url} alt={`Sheet music ${active.id}`} />
          )}
        </div>
      )}
    </div>
  );
}
