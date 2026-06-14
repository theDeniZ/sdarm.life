import Link from 'next/link';
import SongbookList from '../domains/songbooks/SongbookList';

export default function SongbooksPage() {
  return (
    <>
      <div className="page-header">
        <h1>Songbooks</h1>
        <Link href="/songbooks/new" className="btn-primary">
          + New songbook
        </Link>
      </div>
      <SongbookList />
    </>
  );
}
