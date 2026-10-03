'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SongbookDto } from '@sdarm/types';
import { Wordmark } from '@sdarm/ui';

interface SongbookNavProps {
  songbooks?: SongbookDto[];
  webUrl?: string;
}

export default function SongbookNav({ songbooks = [], webUrl = 'https://sdarm.life' }: SongbookNavProps) {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <a href={webUrl} className="top-nav__brand">
        <Wordmark />
      </a>
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
