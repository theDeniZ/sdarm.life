'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Navbar({ songbookUrl = 'https://songs.sdarm.life' }: { songbookUrl?: string }) {
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { label: 'Neuigkeiten', href: '/#neuigkeiten' },
    { label: 'Liederbuch', href: songbookUrl, external: true },
    { label: 'Über uns', href: '/about' },
    { label: 'Produkte', href: '/#produkte' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <Link href="/" className="nav-logo">
        SDARM<span>.life</span>
      </Link>

      <div className="nav-links">
        {navLinks.map(({ label, href, external }) =>
          external ? (
            <a key={href} href={href}>
              {label}
            </a>
          ) : (
            <Link key={href} href={href}>
              {label}
            </Link>
          )
        )}
      </div>

      <div className="nav-right">
        {/* Sunset widget — stub */}
        <div className="sunset-widget">
          <span className="sunset-icon">🌅</span>
          <div className="sunset-text">
            Schabbat<strong>Freitag</strong>
          </div>
        </div>

        <button className="nav-search" aria-label="Suche">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="7.5" cy="7.5" r="5" />
            <line x1="11.5" y1="11.5" x2="16" y2="16" />
          </svg>
        </button>

        <div className="nav-menu" aria-label="Menü">
          <span />
          <span />
          <span />
        </div>
      </div>
    </nav>
  );
}
