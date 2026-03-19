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

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-text">
          SDARM<span className="accent">.life</span>
        </span>
        <span className="logo-admin">Administration</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_LINKS.map(({ href, label, alsoActive }) => {
          const active = path.startsWith(href) || (alsoActive ? path.startsWith(alsoActive) : false);
          return (
            <Link key={href} href={href} className={`sidebar-link${active ? ' active' : ''}`}>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
