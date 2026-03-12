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

const FOOTER_LINKS = [
  { label: 'Über uns',    href: '#ueber-uns' },
  { label: 'Impressum',   href: '/impressum' },
  { label: 'Datenschutz', href: '/datenschutz' },
];

interface FooterProps {
  config?: FooterConfig;
  apiUrl?: string;
}

export default function Footer({ config, apiUrl = 'https://api.sdarm.life/api/v1' }: FooterProps) {
  const donationUrl  = config?.donation_url  ?? '#';
  const facebookUrl  = config?.facebook_url  ?? 'https://www.facebook.com/sdarmchurch';
  const whatsappUrl  = config?.whatsapp_url  ?? '#';
  const instagramUrl = config?.instagram_url ?? 'https://www.instagram.com/sdarmchurch';
  const youtubeUrl   = config?.youtube_url   ?? 'https://www.youtube.com/sdarmchurch';
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(
        `${apiUrl}/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );
      if (res.status === 409) { setSubStatus('conflict'); return; }
      if (!res.ok) throw new Error();
      setSubStatus('ok');
      setEmail('');
    } catch {
      setSubStatus('error');
    }
  }

return (
    <footer>
      <div className="footer-top">
        {/* Logo */}
        <div>
          <Link href="/" className="f-logo">
            <span className="red">sdarm</span>.life
          </Link>
        </div>

        {/* Subscribe */}
        <div className="f-sub">
          <div className="f-sub-row">
            <input
              type="email"
              placeholder="Ihre E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
              disabled={subStatus === 'loading'}
            />
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={subStatus === 'loading'}
            >
              {subStatus === 'loading' ? '…' : 'Subscribe'}
            </button>
          </div>
          {subStatus === 'ok'       && <p className="f-sub-ok">Vielen Dank für Ihre Anmeldung!</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">Diese E-Mail ist bereits registriert.</p>}
          {subStatus === 'error'    && <p className="f-sub-err">Fehler. Bitte versuchen Sie es später.</p>}
        </div>

        {/* Donate */}
        <div className="f-don">
          <a href={donationUrl} target="_blank" rel="noopener noreferrer" className="btn-donate">Donate</a>
        </div>
      </div>

      <div className="footer-bottom">
        <ul className="f-nav">
          {FOOTER_LINKS.map(({ label, href }) => (
            <li key={href}>
              <a href={href} rel="noopener noreferrer">{label}</a>
            </li>
          ))}
        </ul>

        {/* Footer lang switcher */}
        {/* <div
          className={`f-lang-sw${open ? ' open' : ''}`}
          ref={ref}
        >
          <button
            className="f-lang-btn"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            {lang}
          </button>
          <div className="f-lang-drop">
            {LANGS.map((l) => (
              <a
                key={l}
                href="#"
                className={l === lang ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setLang(l);
                  setOpen(false);
                }}
              >
                {l}
              </a>
            ))}
          </div>
        </div> */}

        {/* Social icons */}
        <div className="f-social">
          {/* Facebook */}
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
          </a>
          {/* WhatsApp */}
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
          {/* Instagram */}
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
          {/* YouTube */}
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
