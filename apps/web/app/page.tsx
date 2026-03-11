import BgCanvas from './components/BgCanvas';
import Navbar from './components/Navbar';
import HeroSection, { type HeroPost } from './components/HeroSection';
import NewsSection, { type NewsPost } from './components/NewsSection';
import VideoSection, { type VideoPost } from './components/VideoSection';
import SongbookSection from './components/SongbookSection';
import AboutSection, { type AboutConfig } from './components/AboutSection';
import ProductsSection from './components/ProductsSection';
import Footer, { type FooterConfig } from './components/Footer';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ── API types (shape returned by Drizzle / Hono) ──────────────────────────────

interface ApiPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  author: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
}

type ApiConfig = Record<string, string | null>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';

const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';

function r2url(key: string | null): string | null {
  return key && R2 ? `${R2}/${key}` : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchPosts(): Promise<ApiPost[] | null> {
  try {
    const res = await fetch(`${API}/posts`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchConfig(): Promise<ApiConfig | null> {
  try {
    const res = await fetch(`${API}/config`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

// Fallback image used when a post has no cover (keeps sections from breaking)
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop';

function toHeroPost(post: ApiPost): HeroPost {
  return {
    title: post.title,
    meta: `${formatDate(post.publishedAt)}${post.author ? ` · ${post.author}` : ''}`,
    imageUrl: r2url(post.coverKey) ?? FALLBACK_IMG,
    imageAlt: post.coverAlt ?? post.title,
  };
}

function toNewsPost(post: ApiPost): NewsPost {
  return {
    id: String(post.id),
    title: post.title,
    date: formatDate(post.publishedAt),
    author: post.author ?? '',
    imageUrl: r2url(post.coverKey) ?? FALLBACK_IMG,
    imageAlt: post.coverAlt ?? post.title,
    href: `/${post.slug}`,
    hasVideo: !!post.videoUrl,
  };
}

function toVideoPost(post: ApiPost): VideoPost {
  return {
    id: String(post.id),
    title: post.title,
    meta: post.author ? `${post.author} · ${formatDate(post.publishedAt)}` : 'sdarm.life',
    imageUrl: r2url(post.coverKey) ?? FALLBACK_IMG,
    imageAlt: post.coverAlt ?? post.title,
    href: post.videoUrl ?? '#',
  };
}

function toAboutConfig(config: ApiConfig): AboutConfig {
  return {
    about_text_1:   config.about_text_1   ?? undefined,
    about_text_2:   config.about_text_2   ?? undefined,
    about_image_url: config.about_image_key ? r2url(config.about_image_key) ?? undefined : undefined,
    about_image_alt: config.about_image_alt ?? undefined,
    about_link_url:  config.about_link_url  ?? undefined,
  };
}

function toFooterConfig(config: ApiConfig): FooterConfig {
  return {
    donation_url:  config.donation_url  ?? undefined,
    facebook_url:  config.facebook_url  ?? undefined,
    whatsapp_url:  config.whatsapp_url  ?? undefined,
    instagram_url: config.instagram_url ?? undefined,
    youtube_url:   config.youtube_url   ?? undefined,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [allPosts, config] = await Promise.all([fetchPosts(), fetchConfig()]);

  const featuredPost = allPosts?.find((p) => p.isFeatured);
  const newsPosts    = allPosts?.map(toNewsPost);
  const videoPosts   = allPosts?.filter((p) => !!p.videoUrl).map(toVideoPost);

  const heroPost    = featuredPost ? toHeroPost(featuredPost) : undefined;
  const aboutConfig = config ? toAboutConfig(config) : undefined;
  const footerConfig = config ? toFooterConfig(config) : undefined;

  const bgImageUrl = config?.hero_bg_key ? r2url(config.hero_bg_key) : null;

  return (
    <>
      <BgCanvas bgImageUrl={bgImageUrl} />
      <Navbar />
      
      <div className="page">
        <HeroSection post={heroPost} />
        <NewsSection  posts={newsPosts} />
        <VideoSection videos={videoPosts} />
        <SongbookSection />
        <AboutSection config={aboutConfig} />
        <ProductsSection />
      </div>
      <Footer config={footerConfig} apiUrl={process.env.API_URL} />
    </>
  );
}
