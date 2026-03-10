import Image from 'next/image';

const HERO_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg/1280px-Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg';

/**
 * Hero section.
 * In Phase 4, replace the static props with data fetched from api.sdarm.life
 * (e.g. the latest featured post returned by GET /api/posts?featured=true).
 */
export default function HeroSection() {
  return (
    <>
      <div className="page">
        <div className="hero">
          <div className="hero-eye">Aktuell 1/3</div>
          <div className="hero-meta">21.09.2020 · Maksim Korol</div>
          <h1>Die Reformation und ihre Folgen für Deutschland und die ganze Welt</h1>
        </div>
      </div>

      {/* Full-bleed banner — bleeds outside .page padding */}
      <div className="hero-banner">
        <Image
          id="heroImg"
          src={HERO_IMG}
          alt="Historisches Gemälde"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
          priority
        />
      </div>
    </>
  );
}

export { HERO_IMG };
