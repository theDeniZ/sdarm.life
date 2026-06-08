'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCurrentTheme, withTheme } from '../lib/theme-link';

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
  const [overDark, setOverDark] = useState(false);
  const [activeHref, setActiveHref] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const theme = useCurrentTheme();

  const navLinks = [
    { label: t('songs'), href: songbookUrl, external: true },
    { label: t('events'), href: eventsUrl, external: true },
    { label: t('treasures'), href: treasuresUrl, external: true },
    { label: t('about'), href: `${webUrl}/about`, external: true },
    { label: t('contact'), href: `${webUrl}/kontakt`, external: true },
  ];

  useEffect(() => {
    // Sync scroll state on mount and on every route change
    setScrolled(window.scrollY > 40);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Adaptive contrast: navbar text flips to "always-dark" colors while it
  // overlaps any [data-nav-overlay="dark"] section (e.g. cosmic hero).
  useEffect(() => {
    const navHeight = 72;
    function update() {
      const els = document.querySelectorAll<HTMLElement>('[data-nav-overlay="dark"]');
      let over = false;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < navHeight && r.bottom > 0) over = true;
      });
      setOverDark(over);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  useEffect(() => {
    const host = window.location.hostname;
    if (host.includes('treasures')) {
      setActiveHref(treasuresUrl);
    } else if (host.includes('songs') || host.includes('songbook')) {
      setActiveHref(songbookUrl);
    } else if (host.includes('events')) {
      setActiveHref(eventsUrl);
    } else if (pathname.match(/^\/(de|en)\/kontakt(\/|$)/)) {
      setActiveHref(`${webUrl}/kontakt`);
    } else if (pathname.match(/^\/(de|en)\/about(\/|$)/)) {
      setActiveHref(`${webUrl}/about`);
    } else {
      setActiveHref(webUrl);
    }
  }, [webUrl, songbookUrl, eventsUrl, treasuresUrl, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const otherLocale = locale === 'de' ? 'en' : 'de';
  const otherLabel = otherLocale === 'de' ? 'Deutsch' : 'English';
  const [switchedPath, setSwitchedPath] = useState(`/${otherLocale}`);

  useEffect(() => {
    setSwitchedPath(window.location.pathname.replace(/^\/(de|en)/, `/${otherLocale}`));
  }, [otherLocale]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <nav className={`${scrolled ? 'scrolled' : ''}${overDark ? ' over-dark' : ''}`.trim()}>
        <Link href={withTheme(webUrl, theme)} className="nav-logo">
          SDARM<span>.life</span>
        </Link>

        <div className="nav-links">
          {navLinks.map(({ label, href }) => (
            <Link key={href} href={withTheme(href, theme)} className={href === activeHref ? 'active' : undefined}>
              {label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <Link href={switchedPath} className="nav-lang" aria-label={`Switch to ${otherLabel}`}>
            {otherLocale.toUpperCase()}
          </Link>
          <button
            className="nav-theme"
            type="button"
            aria-label={t('themeToggleAria')}
            onClick={() => window.dispatchEvent(new Event('sdarm:toggle-theme'))}
          >
            <svg className="nav-theme__icon nav-theme__icon--sun" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="9" cy="9" r="3.2" />
              <line x1="9" y1="1.5" x2="9" y2="3.5" strokeLinecap="round" />
              <line x1="9" y1="14.5" x2="9" y2="16.5" strokeLinecap="round" />
              <line x1="1.5" y1="9" x2="3.5" y2="9" strokeLinecap="round" />
              <line x1="14.5" y1="9" x2="16.5" y2="9" strokeLinecap="round" />
              <line x1="3.7" y1="3.7" x2="5.1" y2="5.1" strokeLinecap="round" />
              <line x1="12.9" y1="12.9" x2="14.3" y2="14.3" strokeLinecap="round" />
              <line x1="3.7" y1="14.3" x2="5.1" y2="12.9" strokeLinecap="round" />
              <line x1="12.9" y1="5.1" x2="14.3" y2="3.7" strokeLinecap="round" />
            </svg>
            <svg className="nav-theme__icon nav-theme__icon--moon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M14.5 11A6 6 0 0 1 7 3.5a6 6 0 1 0 7.5 7.5Z" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className={`nav-burger${menuOpen ? ' nav-burger--open' : ''}`}
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="nav-burger__line" />
            <span className="nav-burger__line" />
            <span className="nav-burger__line" />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div className={`nav-mobile${menuOpen ? ' nav-mobile--open' : ''}`} aria-hidden={!menuOpen}>
        <div className="nav-mobile__links">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={withTheme(href, theme)}
              className={href === activeHref ? 'active' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
