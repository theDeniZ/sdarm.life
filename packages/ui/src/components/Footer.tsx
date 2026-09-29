'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import CommunityMap from './CommunityMap';
import { useSunsetLocation } from '../lib/sunset-location';
import { useCurrentTheme, withTheme } from '../lib/theme-link';

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
  webUrl?: string;
  songbookUrl?: string;
  eventsUrl?: string;
  treasuresUrl?: string;
  sblUrl?: string;
  locale?: string;
}

export default function Footer({
  config,
  apiUrl = 'https://api.sdarm.life/api/v1',
  webUrl = 'https://sdarm.life',
  songbookUrl = 'https://songs.sdarm.life',
  eventsUrl = 'https://events.sdarm.life',
  treasuresUrl = 'https://treasures.sdarm.life',
  sblUrl = 'https://sbl.sdarm.life',
  locale = 'de',
}: FooterProps) {
  const t = useTranslations('common.footer');
  const clockT = useTranslations('common.clock');
  const navT = useTranslations('common.nav');
  const theme = useCurrentTheme();

  const facebookUrl = config?.facebook_url ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const youtubeUrl = config?.youtube_url ?? '#';
  const whatsappUrl = config?.whatsapp_url ?? '#';

  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');
  // The map marks the visitor's sunset location, shared with the home page's
  // sunset card (SunsetClock).
  const [location, pickLocation] = useSunsetLocation(clockT('defaultLocation'));

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: locale }),
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
      <CommunityMap current={location} onPick={pickLocation} />

      <div className="footer-inner-wrap">
        {/* Column 1: contact + subscribe */}
        <div className="footer-contact">
          <h2 className="footer-heading">{t.rich('stayInTouch', { em: (chunks) => <em>{chunks}</em> })}</h2>

          <div className="footer-social">
            <a href={instagramUrl} title="Instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={youtubeUrl} title="YouTube" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={whatsappUrl} title="WhatsApp" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </a>
            <a href={facebookUrl} title="Facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
          </div>

          <a className="footer-email-link" href="mailto:info@sdarm.life">
            info@sdarm.life
          </a>
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
              placeholder={t('newsletter')}
              aria-label={t('emailInputAria')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subStatus === 'loading'}
            />
            <button
              className="footer-subscribe"
              type="submit"
              disabled={subStatus === 'loading'}
              aria-label={t('subscribeButton')}
            >
              {subStatus === 'loading' ? (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle
                    cx="8"
                    cy="8"
                    r="5"
                    strokeDasharray="28"
                    strokeDashoffset="10"
                    style={{ animation: 'footer-spin 0.8s linear infinite' }}
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <line x1="3" y1="8" x2="12" y2="8" />
                  <polyline points="8,4 12,8 8,12" />
                </svg>
              )}
            </button>
          </form>
          {subStatus === 'ok' && <p className="f-sub-ok">{t('subscribeSuccess')}</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">{t('subscribeDuplicate')}</p>}
          {subStatus === 'error' && <p className="f-sub-err">{t('subscribeError')}</p>}
        </div>

        {/* Column 2: nav links */}
        <nav className="footer-nav" aria-label={t('footerNavAria')}>
          <div className="footer-nav-links">
            <Link href={withTheme(songbookUrl, theme)}>{navT('songs')}</Link>
            <Link href={withTheme(`${treasuresUrl}/bible`, theme)}>{navT('bible')}</Link>
            <Link href={withTheme(treasuresUrl, theme)}>{navT('treasures')}</Link>
            <Link href={sblUrl}>{navT('sbl')}</Link>
            <Link href={withTheme(eventsUrl, theme)}>{navT('events')}</Link>
            <Link href={withTheme(`${webUrl}/about`, theme)}>{navT('about')}</Link>
            <Link href={withTheme(`${webUrl}/kontakt`, theme)}>{navT('contact')}</Link>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <span className="footer-bottom-logo">
          SDARM<span>.life</span>
        </span>
        <span className="footer-copy">{t('copyright', { year: new Date().getFullYear() })}</span>
        <div className="footer-legal">
          <Link href={withTheme(`${webUrl}/impressum`, theme)}>{navT('imprint')}</Link>
          <span>·</span>
          <Link href={withTheme(`${webUrl}/datenschutz`, theme)}>{navT('privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}
