export const runtime = 'edge';

import Link from 'next/link';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ConnectedNavbar />
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
      <ConnectedFooter />
    </div>
  );
}
