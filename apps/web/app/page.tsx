import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import NewsSection from './components/NewsSection';
import UberUnsSection from './components/UberUnsSection';
import Footer from './components/Footer';
import { fetchPosts, fetchConfig, toHeroPost, toFooterConfig, SONGBOOK_URL } from './lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featuredRaw, config] = await Promise.all([fetchPosts('featured=1'), fetchConfig()]);

  const heroPosts = featuredRaw?.map(toHeroPost) ?? [];
  const footerConfig = config ? toFooterConfig(config) : undefined;

  return (
    <>
      <Navbar songbookUrl={SONGBOOK_URL} />
      <HeroSection posts={heroPosts} />
      <NewsSection />
      <UberUnsSection />
      <Footer config={footerConfig} apiUrl={process.env.API_URL} songbookUrl={SONGBOOK_URL} />
    </>
  );
}
