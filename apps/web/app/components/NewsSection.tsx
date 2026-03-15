'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface NewsPost {
  id: string;
  title: string;
  date: string;
  author: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

const STATIC_NEWS: NewsPost[] = [
  {
    id: '1',
    title: 'Säulen der Reformation. Beschreibung der Werke.',
    date: '13.10.2020',
    author: 'Konstantin Serbak',
    body: '',
    imageUrl: 'https://images.unsplash.com/photo-1548625149-720f8b21c35a?w=800&q=85&fit=crop',
    imageAlt: 'Gotische Kirche',
    href: '#',
  },
  {
    id: '2',
    title: 'Musikgruppe gibt mächtige Aufführung von „Jesus Paid It All"',
    date: '23.01.2020',
    author: 'FaithPot',
    body: '',
    imageUrl: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=800&q=85&fit=crop',
    imageAlt: 'Himmlisches Licht',
    href: '#',
  },
  {
    id: '3',
    title: 'Johannes Calvin: Theologe und Pastor',
    date: '17.04.2020',
    author: 'Andrey Doolan',
    body: '',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=85&fit=crop',
    imageAlt: 'Alter Text',
    href: '#',
  },
  {
    id: '4',
    title: 'Das Neue Testament. Ist es heute noch relevant?',
    date: '26.08.2020',
    author: 'Igor Timofer',
    body: '',
    imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=85&fit=crop',
    imageAlt: 'Bibel im Kerzenlicht',
    href: '#',
  },
];

const RATIO_CYCLE = ['ratio-16-9', 'ratio-9-16', 'ratio-1-1', 'ratio-3-4'] as const;

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default function NewsSection({ posts = STATIC_NEWS }: { posts?: NewsPost[] }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let msnry: { destroy?: () => void } | null = null;

    Promise.all([import('masonry-layout'), import('imagesloaded')]).then(([MasonryModule, imagesLoadedModule]) => {
      const Masonry = MasonryModule.default;
      const imagesLoaded = imagesLoadedModule.default;

      imagesLoaded(grid, () => {
        msnry = new Masonry(grid, {
          itemSelector: '.masonry-item',
          columnWidth: '.masonry-item',
          gutter: '.gutter-sizer',
          percentPosition: true,
          fitWidth: true,
        });

        const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
        items.forEach((el, i) => {
          setTimeout(() => el.classList.add('is-visible'), i * 55);
        });
      });
    });

    return () => {
      msnry?.destroy?.();
    };
  }, [posts]);

  if (posts.length === 0) return null;

  return (
    <section className="events-section" id="neuigkeiten">
      <div className="neues-header">
        <div className="neues-eyebrow">Aktuelles &amp; Einblicke</div>
        <h2 className="neues-title">
          Was uns <em>bewegt</em>
        </h2>
        <p className="neues-subtitle">Bilder aus unserem Gemeindeleben — Momente, die Glauben sichtbar machen.</p>
      </div>

      <div className="masonry-wrap">
        <div className="masonry-grid" ref={gridRef}>
          <div className="gutter-sizer" />
          {posts.map((post, i) => (
            <Link key={post.id} href={post.href} className={`masonry-item ${RATIO_CYCLE[i % RATIO_CYCLE.length]}`}>
              <div className="img-wrap">
                <Image
                  src={post.imageUrl}
                  alt={post.imageAlt}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized={isUnoptimized(post.imageUrl)}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
