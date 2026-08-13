import SongbookList from '../domains/songbooks/SongbookList';

export default function SongbooksPage() {
  return (
    <>
      <div className="page-header">
        <h1>Songbooks</h1>
      </div>
      <SongbookList />
    </>
  );
}
