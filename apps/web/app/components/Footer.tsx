'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface FooterConfig {
  donation_url?: string | null;
  facebook_url?: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
}

interface FooterProps {
  config?: FooterConfig;
  apiUrl?: string;
  songbookUrl?: string;
}

export default function Footer({
  config,
  apiUrl = 'https://api.sdarm.life/api/v1',
  songbookUrl = 'https://songs.sdarm.life',
}: FooterProps) {
  const facebookUrl = config?.facebook_url ?? '#';
  const whatsappUrl = config?.whatsapp_url ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const youtubeUrl = config?.youtube_url ?? '#';
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.status === 409) {
        setSubStatus('conflict');
        return;
      }
      if (!res.ok) throw new Error();
      setSubStatus('ok');
      setEmail('');
    } catch {
      setSubStatus('error');
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-map" />
      <div className="footer-map-tip">
        Wir freuen uns,
        <br />
        dich hier zu sehen!
      </div>

      <div className="footer-inner">
        {/* Left: contact + subscribe */}
        <div className="footer-contact">
          <h3 className="footer-heading">
            In Kontakt
            <br />
            bleiben
          </h3>
          <div className="footer-info">
            Reformierte Adventisten
            <br />
            Deutschland &amp; Österreich
          </div>
          <div className="footer-social">
            <a href={facebookUrl} title="Facebook" target="_blank" rel="noopener noreferrer">
              fb
            </a>
            <a href={whatsappUrl} title="WhatsApp" target="_blank" rel="noopener noreferrer">
              wa
            </a>
            <a href={instagramUrl} title="Instagram" target="_blank" rel="noopener noreferrer">
              ig
            </a>
            <a href={youtubeUrl} title="YouTube" target="_blank" rel="noopener noreferrer">
              yt
            </a>
          </div>
          <form
            className="footer-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubscribe();
            }}
          >
            <input
              className="footer-input"
              type="email"
              placeholder="E-Mail für Newsletter"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subStatus === 'loading'}
            />
            <button className="footer-subscribe" type="submit" disabled={subStatus === 'loading'}>
              {subStatus === 'loading' ? '…' : 'Abonnieren'}
            </button>
          </form>
          {subStatus === 'ok' && <p className="f-sub-ok">Vielen Dank für Ihre Anmeldung!</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">Diese E-Mail ist bereits registriert.</p>}
          {subStatus === 'error' && <p className="f-sub-err">Fehler. Bitte versuchen Sie es später.</p>}
        </div>

        {/* Right: nav links */}
        <div className="footer-nav">
          <div className="footer-nav-title">Navigation</div>
          <div className="footer-nav-links">
            <Link href="/#neuigkeiten">Neuigkeiten</Link>
            <a href={songbookUrl}>Liederbuch</a>
            <Link href="/about">Über uns</Link>
            <Link href="/#produkte">Produkte</Link>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copy">© 2026 SDARM.life — Siebenten-Tags-Adventisten Reformationsbewegung</span>
        <span className="footer-copy">Alle Rechte vorbehalten</span>
      </div>
    </footer>
  );
}
