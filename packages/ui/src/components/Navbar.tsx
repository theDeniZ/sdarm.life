'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Navbar({
  locale,
  webUrl = 'https://sdarm.life',
  songbookUrl = 'https://songs.sdarm.life',
  eventsUrl = 'https://events.sdarm.life',
  treasuresUrl = 'https://treasures.sdarm.life',
}: {
  locale: string;
  webUrl?: string;
  songbookUrl?: string;
  eventsUrl?: string;
  treasuresUrl?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState('');
  const t = useTranslations('common.nav');

  const navLinks = [
    { label: t('news'), href: `${webUrl}/#neuigkeiten`, external: true },
    { label: t('songs'), href: songbookUrl, external: true },
    { label: t('events'), href: eventsUrl, external: true },
    { label: t('treasures'), href: treasuresUrl, external: true },
    { label: t('about'), href: `${webUrl}/about`, external: true },
    { label: t('contact'), href: `${webUrl}/#kontakt`, external: true },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const host = window.location.hostname;
    if (host.includes('treasures')) setActiveHref(treasuresUrl);
    else if (host.includes('songs') || host.includes('songbook')) setActiveHref(songbookUrl);
    else if (host.includes('events')) setActiveHref(eventsUrl);
    else setActiveHref(webUrl);
  }, [webUrl, songbookUrl, eventsUrl, treasuresUrl]);

  const otherLocale = locale === 'de' ? 'en' : 'de';
  const otherLabel = otherLocale === 'de' ? 'Deutsch' : 'English';
  const [switchedPath, setSwitchedPath] = useState(`/${otherLocale}`);

  useEffect(() => {
    setSwitchedPath(window.location.pathname.replace(/^\/(de|en)/, `/${otherLocale}`));
  }, [otherLocale]);

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <Link href={webUrl} className="nav-logo">
        SDARM<span>.life</span>
      </Link>

      <div className="nav-links">
        {navLinks.map(({ label, href }) => (
          <Link key={href} href={href} className={href === activeHref ? 'active' : undefined}>
            {label}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        <Link href={switchedPath} className="nav-lang" aria-label={`Switch to ${otherLabel}`}>
          {otherLocale.toUpperCase()}
        </Link>
        <button className="nav-search" aria-label={t('searchAria')}>
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="7.5" cy="7.5" r="5" />
            <line x1="11.5" y1="11.5" x2="16" y2="16" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
