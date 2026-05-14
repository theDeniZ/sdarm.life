'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TreasureForm from '../../domains/treasures/TreasureForm';
import { fetchTreasure } from '../../domains/treasures/repository';
import type { TreasureDto } from '@sdarm/types';

export default function EditTreasurePage() {
  const { id } = useParams<{ id: string }>();
  const [treasure, setTreasure] = useState<TreasureDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTreasure(parseInt(id, 10))
      .then(setTreasure)
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="state-error">{error}</div>;
  if (!treasure) return <div className="state-loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Edit treasure</h1>
      </div>
      <TreasureForm
        id={treasure.id}
        initial={{
          title: treasure.title,
          author: treasure.author ?? '',
          description: treasure.description ?? '',
          type: treasure.type,
          language: treasure.language,
          coverGradient: treasure.coverGradient ?? '',
          coverAccentColor: treasure.coverAccentColor ?? '',
          coverKey: treasure.coverKey,
          isFree: treasure.isFree,
          price: treasure.price ?? '',
          sortOrder: treasure.sortOrder,
          epubUrl: treasure.epubUrl ?? '',
        }}
      />
    </>
  );
}
