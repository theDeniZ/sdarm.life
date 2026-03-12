import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  thumbKey: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';
const R2  = process.env.R2_URL  ?? 'https://images.sdarm.life';

function r2url(key: string | null): string | null {
  return key && R2 ? `${R2}/${key}` : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop';

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [postRes, allRes] = await Promise.all([
    fetch(`${API}/posts/${slug}`, { cache: 'no-store' }),
    fetch(`${API}/posts?limit=5`, { cache: 'no-store' }),
  ]);

  if (!postRes.ok) notFound();

  const post = (await postRes.json()) as ApiPost;
  const allPosts: ApiPost[] = allRes.ok ? ((await allRes.json()) as { items: ApiPost[] }).items : [];

  const coverUrl = r2url(post.coverKey) ?? FALLBACK_IMG;
  const meta = [formatDate(post.publishedAt), post.author].filter(Boolean).join(' · ');

  const others = allPosts.filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <>
      <Navbar />

      <div className="page">
        {/* Hero */}
        <div className="hero post-hero">
          <Link href="/" className="post-back">
            ← Zurück
          </Link>
          <div className="hero-bg">
            <Image
              src={coverUrl}
              alt={post.coverAlt ?? post.title}
              fill
              style={{ objectFit: 'cover' }}
              sizes="100vw"
              priority
            />
          </div>
          <div className="hero-bg-overlay" />
          <div className="hero-text">
            {meta && <div className="post-meta">{meta}</div>}
            <h1>{post.title}</h1>
          </div>
        </div>

        {/* Body */}
        {post.body && (
          <div className="section-block">
            <div className="section-label">Inhalt</div>
            <div className="post-body">{post.body}</div>
          </div>
        )}

        {/* Video section */}
        {post.videoUrl && (
          <div className="section-block">
            <div className="section-label">Video</div>
            <div className="video-grid">
              <div className="video-card">
                <a
                  className="img16"
                  href={post.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ position: 'relative' }}
                >
                  <Image
                    src={coverUrl}
                    alt={post.coverAlt ?? post.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="play-over">
                    <div className="play-circle" />
                  </div>
                </a>
                <h3>{post.title}</h3>
                {meta && <div className="meta">{meta}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Other posts */}
        {others.length > 0 && (
          <div className="section-block">
            <div className="post-more-title">Weitere Beiträge</div>
            <div className="news-grid">
              {others.map((p) => {
                const imgUrl = r2url(p.coverKey) ?? FALLBACK_IMG;
                const pMeta = [formatDate(p.publishedAt), p.author].filter(Boolean).join(' · ');
                return (
                  <div key={p.id} className="news-card">
                    <Link
                      className="img16"
                      href={`/posts/${p.slug}`}
                      style={{ position: 'relative' }}
                    >
                      <Image
                        src={imgUrl}
                        alt={p.coverAlt ?? p.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </Link>
                    <h3>{p.title}</h3>
                    <div className="meta">{pMeta}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Footer apiUrl={process.env.API_URL} />
    </>
  );
}
