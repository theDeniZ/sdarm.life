export const runtime = 'edge';

import SongbookForm from '../../domains/songbooks/SongbookForm';

export default function NewSongbookPage() {
  return (
    <>
      <div className="page-header">
        <h1>New Songbook</h1>
      </div>
      <SongbookForm />
    </>
  );
}
