import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import HeroSection from './components/HeroSection';
import NewsSection from './components/NewsSection';
import ScriptureVerseSection from './components/ScriptureVerseSection';
import UberUnsSection from './components/UberUnsSection';
import { fetchPosts, toHeroPost } from './lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const featuredRaw = await fetchPosts('featured=1');
  const heroPosts = featuredRaw?.map(toHeroPost) ?? [];

  return (
    <>
      <ConnectedNavbar />
      <HeroSection posts={heroPosts} />
      <NewsSection />
      <ScriptureVerseSection />
      <UberUnsSection />
      <ConnectedFooter />
    </>
  );
}
