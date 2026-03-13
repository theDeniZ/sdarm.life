export const runtime = 'edge';

import { fetchSong } from '../../domains/songbooks/repository';
import SongEditor from '../../domains/songbooks/SongEditor';
import Link from 'next/link';

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const song = await fetchSong(id);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            #{song.number} {song.title}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{song.songbook.title}</div>
        </div>
        <Link href={`/songbooks/${song.songbook.id}/songs`} className="btn-ghost">
          ← Songs
        </Link>
      </div>
      <SongEditor song={song} />
    </>
  );
}
