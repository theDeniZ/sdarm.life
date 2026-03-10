/**
 * apps/web/app/page.tsx
 *
 * Public homepage — server component.
 * In Phase 4, uncomment the fetch calls to pull live data from api.sdarm.life.
 *
 * Component hierarchy:
 *   BgCanvas          (client — canvas effect)
 *   Navbar            (client — lang switcher state)
 *   HeroSection       (server)
 *   .page
 *     NewsSection     (server — accepts posts prop)
 *     VideoSection    (server — accepts videos prop)
 *     SongbookSection (server — accepts songs prop)
 *     AboutSection    (server)
 *     ProductsSection (server — accepts products prop)
 *   Footer            (client — lang switcher + subscribe state)
 */

import BgCanvas from './components/BgCanvas';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import NewsSection from './components/NewsSection';
import VideoSection from './components/VideoSection';
import SongbookSection from './components/SongbookSection';
import AboutSection from './components/AboutSection';
import ProductsSection from './components/ProductsSection';
import Footer from './components/Footer';

// ── Phase 4: uncomment and implement these fetchers ──────────────────────────
//
// async function getPosts() {
//   const res = await fetch('https://api.sdarm.life/api/posts', {
//     next: { revalidate: 60 },
//   });
//   if (!res.ok) return undefined;
//   return res.json();
// }
//
// async function getVideos() {
//   const res = await fetch('https://api.sdarm.life/api/videos', {
//     next: { revalidate: 60 },
//   });
//   if (!res.ok) return undefined;
//   return res.json();
// }
//
// async function getSongs() {
//   const res = await fetch('https://api.sdarm.life/api/songs', {
//     next: { revalidate: 3600 },
//   });
//   if (!res.ok) return undefined;
//   return res.json();
// }
//
// async function getProducts() {
//   const res = await fetch('https://api.sdarm.life/api/products', {
//     next: { revalidate: 3600 },
//   });
//   if (!res.ok) return undefined;
//   return res.json();
// }
// ─────────────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Phase 4: replace undefined with awaited fetch results
  // const [posts, videos, songs, products] = await Promise.all([
  //   getPosts(), getVideos(), getSongs(), getProducts(),
  // ]);

  return (
    <>
      {/* Fixed canvas background synced with hero image */}
      <BgCanvas />

      <Navbar />

      <HeroSection />

      <div className="page">
        <NewsSection  /* posts={posts} */ />
        <VideoSection /* videos={videos} */ />
        <SongbookSection /* songs={songs} */ />
        <AboutSection />
        <ProductsSection /* products={products} */ />
      </div>

      <Footer />
    </>
  );
}
