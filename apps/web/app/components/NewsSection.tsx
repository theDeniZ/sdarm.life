import Image from 'next/image';

/**
 * Shape of a news post returned by GET /api/posts (Phase 4).
 * Until the API is ready, static fallback data is used below.
 */
export interface NewsPost {
  id: string;
  title: string;
  date: string;
  author: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
  hasVideo?: boolean;
}

// ── Static fallback (replace with real API data in Phase 4) ──────────────────
const STATIC_NEWS: NewsPost[] = [
  {
    id: '1',
    title: 'Säulen der Reformation. Beschreibung der Werke.',
    date: '13.10.2020',
    author: 'Konstantin Serbak',
    imageUrl: 'https://images.unsplash.com/photo-1548625149-720f8b21c35a?w=800&q=85&fit=crop',
    imageAlt: 'Gotische Kirche',
    href: '#',
  },
  {
    id: '2',
    title: 'Musikgruppe gibt mächtige Aufführung von „Jesus Paid It All"',
    date: '23.01.2020',
    author: 'FaithPot',
    imageUrl: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=800&q=85&fit=crop',
    imageAlt: 'Himmlisches Licht',
    href: '#',
  },
  {
    id: '3',
    title: 'Johannes Calvin: Theologe und Pastor',
    date: '17.04.2020',
    author: 'Andrey Doolan',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop',
    imageAlt: 'Alter Text',
    href: '#',
  },
  {
    id: '4',
    title: 'Das Neue Testament. Ist es heute noch relevant?',
    date: '26.08.2020',
    author: 'Igor Timofer',
    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=85&fit=crop',
    imageAlt: 'Bibel im Kerzenlicht',
    href: '#',
    hasVideo: true,
  },
];

interface NewsSectionProps {
  /** Pass server-fetched posts from page.tsx; falls back to static data if omitted. */
  posts?: NewsPost[];
}

export default function NewsSection({ posts = STATIC_NEWS }: NewsSectionProps) {
  return (
    <div id="neuigkeiten" className="section-block">
      <div className="section-label">Neuigkeiten</div>
      <div>
        <div className="news-grid">
          {posts.map((post) => (
            <div key={post.id} className="news-card">
              <a className="img16" href={post.href} target="_blank" rel="noopener noreferrer" style={{ position: 'relative' }}>
                <Image
                  src={post.imageUrl}
                  alt={post.imageAlt}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {post.hasVideo && (
                  <div className="play-over">
                    <div className="play-circle" />
                  </div>
                )}
              </a>
              <h3>{post.title}</h3>
              <div className="meta">
                {post.date} · {post.author}
              </div>
            </div>
          ))}
        </div>
        <a
          href="https://sdarm.org/category/news/"
          target="_blank"
          rel="noopener noreferrer"
          className="red-link"
        >
          Mehr Artikel →
        </a>
      </div>
    </div>
  );
}
