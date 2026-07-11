'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchSong } from '../../domains/songbooks/repository';
import SongEditor from '../../domains/songbooks/SongEditor';
import type { SongDto } from '@sdarm/types';

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id, 10);
  const [song, setSong] = useState<SongDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSong(songId)
      .then(setSong)
      .catch((e) => setError(String(e)));
  }, [songId]);

  if (error) return <div className="state-error">{error}</div>;
  if (!song) return <div className="state-loading">Loading…</div>;

  return <SongEditor song={song} />;
}
