'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-text">
          sdarm<span className="red">.</span>life
        </span>
        <span className="logo-admin">[admin]</span>
      </div>
      <nav className="sidebar-nav">
        <Link href="/config" className={`sidebar-link${path.startsWith('/config') ? ' active' : ''}`}>
          Config
        </Link>
        <Link href="/posts" className={`sidebar-link${path.startsWith('/posts') ? ' active' : ''}`}>
          Posts
        </Link>
        <Link href="/subscribers" className={`sidebar-link${path.startsWith('/subscribers') ? ' active' : ''}`}>
          Subscribers
        </Link>
        <Link href="/images" className={`sidebar-link${path.startsWith('/images') ? ' active' : ''}`}>
          Images
        </Link>
      </nav>
    </aside>
  );
}
