'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/config', label: 'Config' },
  { href: '/posts', label: 'Posts' },
  { href: '/subscribers', label: 'Subscribers' },
  { href: '/images', label: 'Images' },
  { href: '/songbooks', label: 'Songbooks', alsoActive: '/songs' },
  { href: '/api-keys', label: 'API Keys' },
];

export default function AdminNav() {
  const path = usePathname();

  return (
    <nav className="admin-nav">
      <span className="admin-nav-logo">
        SDARM<span className="accent">.life</span>
        <span className="admin-badge">Admin</span>
      </span>

      <div className="admin-nav-links">
        {NAV_LINKS.map(({ href, label, alsoActive }) => {
          const active = path.startsWith(href) || (alsoActive ? path.startsWith(alsoActive) : false);
          return (
            <Link key={href} href={href} className={`admin-nav-link${active ? ' active' : ''}`}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
