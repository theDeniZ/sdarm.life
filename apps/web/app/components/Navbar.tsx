'use client';

import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Neuigkeiten', href: '/#neuigkeiten' },
  { label: 'Video',       href: '/#video' },
  { label: 'Liederbuch',  href: '/#liederbuch' },
  { label: 'Über uns',    href: '/#ueber-uns' },
  { label: 'Produkte',    href: '/#produkte' },
];

export default function Navbar() {
  return (
    <nav>
      <div className="nav-logo">
        <Link href="/" className="logo-text">
          <span className="red">sdarm</span>.life
        </Link>
      </div>

      <ul className="nav-links">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={href}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>

      <div className="nav-right">
        {/* Language switcher — commented out
        <div
          className={`lang-sw${open ? ' open' : ''}`}
          id="navLang"
          ref={ref}
        >
          <button
            className="lang-btn"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            {lang}
          </button>
          <div className="lang-drop">
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
        </div>
        */}

        {/* Search button */}
        <button className="search-btn" aria-label="Suche">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
