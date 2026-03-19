'use client';

import { useEffect, useState } from 'react';

export default function Navbar({
  webUrl = 'https://sdarm.life',
  songbookUrl = 'https://songs.sdarm.life',
  eventsUrl = 'https://events.sdarm.life',
  treasuresUrl = 'https://treasures.sdarm.life',
}: {
  webUrl?: string;
  songbookUrl?: string;
  eventsUrl?: string;
  treasuresUrl?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { label: 'Neues', href: `${webUrl}/#neuigkeiten`, external: true },
    { label: 'Lieder', href: songbookUrl, external: true },
    { label: 'Events', href: eventsUrl, external: true },
    { label: 'Schätze', href: treasuresUrl, external: true },
    { label: 'Über uns', href: `${webUrl}/about`, external: true },
    { label: 'Kontakt', href: `${webUrl}/#kontakt`, external: true },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <a href={webUrl} className="nav-logo">
        SDARM<span>.life</span>
      </a>

      <div className="nav-links">
        {navLinks.map(({ label, href }) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </div>

      <div className="nav-right">
        <button className="nav-search" aria-label="Suche">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="7.5" cy="7.5" r="5" />
            <line x1="11.5" y1="11.5" x2="16" y2="16" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
