'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SongSheetDto } from '@sdarm/types';
import { r2url } from '@/app/lib/api';

export default function SheetViewer({ sheets }: { sheets: SongSheetDto[] }) {
  const t = useTranslations('songbook.sheets');
  const [selectedId, setSelectedId] = useState<number | null>(sheets.length > 0 ? sheets[0].id : null);

  if (sheets.length === 0) {
    return <p className="sheet-viewer__empty">{t('noSheets')}</p>;
  }

  const active = sheets.find((s) => s.id === selectedId) ?? null;
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
            {sheet.type === 'pdf' ? '📄' : '🖼'} {t('sheetTab', { n: i + 1 })}
          </button>
        ))}
      </div>

      {url && active && (
        <div className="sheet-display">
          {active.type === 'pdf' ? (
            <iframe src={url} title={t('sheetTitle', { id: active.id })} />
          ) : (
            <img src={url} alt={t('sheetAlt', { id: active.id })} />
          )}
        </div>
      )}
    </div>
  );
}
