import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchPost, fetchPosts, r2url, FALLBACK_IMG, WEB_URL } from '../../../lib/api';
import { formatDate } from '../../../lib/format';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BASE = WEB_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return {};

  const canonical = `${BASE}/${locale}/posts/${slug}`;
  const ogImage = r2url(post.coverKey, { w: 1200, q: 85 }) ?? FALLBACK_IMG;
  const description = post.excerpt ?? post.body?.slice(0, 160) ?? undefined;

  return {
    title: post.title,
    description,
    alternates: {
      canonical,
      languages: {
        de: `${BASE}/de/posts/${slug}`,
        en: `${BASE}/en/posts/${slug}`,
        'x-default': `${BASE}/de/posts/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.title,
      description,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.coverAlt ?? post.title }],
    },
  };
}

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default async function PostDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.post');
  const ct = await getTranslations('common');

  const [post, allPosts] = await Promise.all([fetchPost(slug), fetchPosts('limit=5')]);

  if (!post) notFound();

  const coverUrl = r2url(post.coverKey, { w: 1200, q: 85 }) ?? FALLBACK_IMG;
  const meta = [formatDate(post.publishedAt), post.author].filter(Boolean).join(' · ');
  const others = (allPosts ?? []).filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <>
      <ConnectedNavbar locale={locale} />

      {/* Hero */}
      <div className="post-hero">
        <Link href={`/${locale}`} className="post-back">
          {ct('back')}
        </Link>
        <div className="post-hero-bg">
          <Image
            src={coverUrl}
            alt={post.coverAlt ?? post.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="100vw"
            priority
            unoptimized={isUnoptimized(coverUrl)}
          />
        </div>
        <div className="post-hero-overlay" />
        {meta && <div className="post-meta">{meta}</div>}
        <h1>{post.title}</h1>
      </div>

      {/* Body */}
      {post.body && (
        <div className="post-section">
          <div className="post-section-label">{t('content')}</div>
          <div className="post-body">{post.body}</div>
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div className="post-section">
          <div className="post-section-label">{t('video')}</div>
          <div className="post-video">
            <a className="post-video-card" href={post.videoUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={coverUrl}
                alt={post.coverAlt ?? post.title}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={isUnoptimized(coverUrl)}
              />
              <div className="post-video-play">
                <svg viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="23" stroke="rgba(201,169,110,.6)" strokeWidth="1" />
                  <polygon points="20,16 34,24 20,32" fill="rgba(201,169,110,.8)" />
                </svg>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Other posts */}
      {others.length > 0 && (
        <div className="post-section">
          <div className="post-more-title">{t('morePosts')}</div>
          <div className="post-grid">
            {others.map((p) => {
              const imgUrl = r2url(p.coverKey, { w: 400, h: 300 }) ?? FALLBACK_IMG;
              const pMeta = [formatDate(p.publishedAt), p.author].filter(Boolean).join(' · ');
              return (
                <Link key={p.id} href={`/${locale}/posts/${p.slug}`} className="post-card">
                  <div className="post-card-img">
                    <Image
                      src={imgUrl}
                      alt={p.coverAlt ?? p.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 25vw"
                      unoptimized={isUnoptimized(imgUrl)}
                    />
                  </div>
                  <div className="post-card-body">
                    <h3 className="post-card-title">{p.title}</h3>
                    <div className="post-card-meta">{pMeta}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <ConnectedFooter locale={locale} />
    </>
  );
}
