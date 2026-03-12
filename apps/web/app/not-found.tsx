export const runtime = 'edge';

import Link from 'next/link';
import Navbar from './components/Navbar';
import Footer, { type FooterConfig } from './components/Footer';

type ApiConfig = Record<string, string | null>;

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';

async function fetchConfig(): Promise<ApiConfig | null> {
  try {
    const res = await fetch(`${API}/config`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function toFooterConfig(config: ApiConfig): FooterConfig {
  return {
    donation_url: config.donation_url ?? undefined,
    facebook_url: config.facebook_url ?? undefined,
    whatsapp_url: config.whatsapp_url ?? undefined,
    instagram_url: config.instagram_url ?? undefined,
    youtube_url: config.youtube_url ?? undefined,
  };
}

export default async function NotFound() {
  const config = await fetchConfig();
  const footerConfig = config ? toFooterConfig(config) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="page" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <section style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#c0392b' }}>404</h1>
          <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0', color: '#1a1a1a' }}>Seite nicht gefunden</h2>
          <p style={{ fontSize: '1.1rem', color: '#555', margin: '1rem 0 2rem 0' }}>
            Die angeforderte Seite existiert nicht.
          </p>
          <Link href="/" className="btn-donate" style={{ marginTop: '1rem' }}>
            Zur Startseite
          </Link>
        </section>
      </div>
      <Footer config={footerConfig} apiUrl={process.env.API_URL} />
    </div>
  );
}
