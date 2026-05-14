import Link from 'next/link';
import TreasureList from '../domains/treasures/TreasureList';

export default function TreasuresPage() {
  return (
    <>
      <div className="page-header">
        <h1>Treasures</h1>
        <Link href="/treasures/new" className="btn-primary">
          + New treasure
        </Link>
      </div>
      <TreasureList />
    </>
  );
}
