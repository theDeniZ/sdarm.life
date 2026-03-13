import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchSongbooks } from './lib/api';

export const runtime = 'edge';

export default async function HomePage() {
  const songbooks = await fetchSongbooks();

  if (songbooks.length === 1) {
    redirect(`/songbooks/${songbooks[0].slug}`);
  }

  return (
    <main className="page">
      <h1 className="page-title">Songbooks</h1>
      <div className="songbook-grid">
        {songbooks.map((sb) => (
          <Link key={sb.id} href={`/songbooks/${sb.slug}`} className="songbook-card">
            <div className="songbook-card__lang">{sb.language}</div>
            <div className="songbook-card__title">{sb.title}</div>
            <div className="songbook-card__meta">
              {sb.songCount} songs{sb.description ? ` · ${sb.description}` : ''}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
