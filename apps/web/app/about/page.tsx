import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchConfig, r2url, toFooterConfig, SONGBOOK_URL } from '../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const STATIC = {
  text1:
    'sdarm.life ist der lokale Onlineauftritt der Siebenten-Tags-Adventisten Reformationsbewegung in Deutschland — Teil der weltweiten Gemeinschaft unter sdarm.org.',
  text2:
    'Unsere Gemeinde entstand als Ort der geistlichen Erneuerung — für Menschen, die biblische Wahrheit, den Sabbat und die Botschaft der Reformation ernst nehmen.',
  imageUrl: 'https://images.unsplash.com/photo-1438232992991-995b671e5cdf?w=800&q=85&fit=crop',
  imageAlt: 'Gemeinde betet',
  linkUrl: 'https://sdarm.org/about-us/',
};

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default async function AboutPage() {
  const config = await fetchConfig();
  const footerConfig = config ? toFooterConfig(config) : undefined;

  const text1 = config?.about_text_1 ?? STATIC.text1;
  const text2 = config?.about_text_2 ?? STATIC.text2;
  const imageUrl = (config?.about_image_key ? r2url(config.about_image_key, { w: 800 }) : null) ?? STATIC.imageUrl;
  const imageAlt = config?.about_image_alt ?? STATIC.imageAlt;
  const linkUrl = config?.about_link_url ?? STATIC.linkUrl;

  return (
    <>
      <Navbar songbookUrl={SONGBOOK_URL} />

      <div className="about-hero">
        <Link href="/" className="post-back">
          ← Zurück
        </Link>
        <h1>Über uns</h1>
        <p className="about-hero-sub">
          Siebenten-Tags-Adventisten Reformationsbewegung in Deutschland &amp; Österreich
        </p>
      </div>

      <div className="about-content">
        <div className="about-grid">
          <div className="about-img">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 600px) 100vw, 50vw"
              unoptimized={isUnoptimized(imageUrl)}
            />
          </div>
          <div className="about-text">
            <div className="about-line" />
            <p>{text1}</p>
            <p>{text2}</p>
            <a href={linkUrl} className="about-link" target="_blank" rel="noopener noreferrer">
              Mehr erfahren → sdarm.org
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="8" x2="13" y2="8" />
                <polyline points="9,4 13,8 9,12" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <Footer config={footerConfig} apiUrl={process.env.API_URL} songbookUrl={SONGBOOK_URL} />
    </>
  );
}
