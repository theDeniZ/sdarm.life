import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import NewsSection from './components/NewsSection';
import ProductsSection from './components/ProductsSection';
import Footer from './components/Footer';
import { fetchPosts, fetchConfig, toHeroPost, toNewsPost, toFooterConfig, SONGBOOK_URL } from './lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featuredRaw, newsRaw, config] = await Promise.all([
    fetchPosts('featured=1'),
    fetchPosts('limit=4'),
    fetchConfig(),
  ]);

  const heroPosts = featuredRaw?.map(toHeroPost) ?? [];
  const newsPosts = newsRaw?.map(toNewsPost);
  const footerConfig = config ? toFooterConfig(config) : undefined;

  return (
    <>
      <Navbar songbookUrl={SONGBOOK_URL} />
      <HeroSection posts={heroPosts} />
      <NewsSection posts={newsPosts ?? undefined} />
      <ProductsSection />
      <Footer config={footerConfig} apiUrl={process.env.API_URL} songbookUrl={SONGBOOK_URL} />
    </>
  );
}
