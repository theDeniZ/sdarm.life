'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SongbookDto } from '@sdarm/types';

export default function SongbookNav({ songbooks = [] }: { songbooks: SongbookDto[] }) {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <Link href="/" className="top-nav__brand">
        SDARM<span className="top-nav__brand-accent">.life</span>
      </Link>
      {songbooks.map((sb) => {
        const href = `/songbooks/${sb.slug}`;
        const active = pathname.startsWith(href);
        return (
          <Link key={sb.id} href={href} className={`top-nav__link${active ? ' active' : ''}`}>
            {sb.title}
          </Link>
        );
      })}
    </nav>
  );
}
