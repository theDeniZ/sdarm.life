import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import NewsSection from './components/NewsSection';
import VideoSection from './components/VideoSection';
import SongbookSection from './components/SongbookSection';
import AboutSection from './components/AboutSection';
import ProductsSection from './components/ProductsSection';
import Footer from './components/Footer';
import { fetchPosts, fetchConfig, toHeroPost, toNewsPost, toVideoPost, toAboutConfig, toFooterConfig } from './lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featuredRaw, newsRaw, videoRaw, config] = await Promise.all([
    fetchPosts('featured=1'),
    fetchPosts('limit=4'),
    fetchPosts('video=1&limit=4'),
    fetchConfig(),
  ]);

  const heroPosts = featuredRaw?.map(toHeroPost) ?? [];
  const newsPosts = newsRaw?.map(toNewsPost);
  const videoPosts = videoRaw?.map(toVideoPost);

  const aboutConfig = config ? toAboutConfig(config) : undefined;
  const footerConfig = config ? toFooterConfig(config) : undefined;

  return (
    <>
      <Navbar />
      <div className="page">
        <HeroSection posts={heroPosts} />
        <NewsSection posts={newsPosts ?? undefined} />
        <VideoSection videos={videoPosts} />
        <SongbookSection />
        <AboutSection config={aboutConfig} />
        <ProductsSection />
      </div>
      <Footer config={footerConfig} apiUrl={process.env.API_URL} />
    </>
  );
}
