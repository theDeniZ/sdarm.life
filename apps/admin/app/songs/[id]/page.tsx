import { fetchSong } from '../../domains/songbooks/repository';
import SongEditor from '../../domains/songbooks/SongEditor';

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const song = await fetchSong(id);

  return <SongEditor song={song} />;
}
