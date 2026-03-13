'use client';

import { useState } from 'react';
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

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default function NewsSection({ posts = STATIC_NEWS }: { posts?: NewsPost[] }) {
  const [idx, setIdx] = useState(0);
  const N = posts.length;
  if (N === 0) return null;
  const ev = posts[idx];
  const left = posts[(idx - 1 + N) % N];
  const right = posts[(idx + 1) % N];

  return (
    <section className="events-section" id="neuigkeiten">
      <h2 className="events-title">Neuigkeiten</h2>

      <div className="ev-viewport">
        <button className="ev-arrow prev" onClick={() => setIdx((idx - 1 + N) % N)} aria-label="Zurück">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="9,2 4,7 9,12" />
          </svg>
        </button>

        {/* Left side preview */}
        <div className="ev-side left" onClick={() => setIdx((idx - 1 + N) % N)}>
          <div className="ev-side-img">
            <Image
              src={left.imageUrl}
              alt={left.imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized={isUnoptimized(left.imageUrl)}
            />
          </div>
          <div className="ev-side-label">{left.title}</div>
        </div>

        {/* Main */}
        <div className="ev-main">
          <div className="ev-images">
            <div className="ev-img-top">
              <div className="ev-bg">
                <Image
                  src={ev.imageUrl}
                  alt={ev.imageAlt}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized={isUnoptimized(ev.imageUrl)}
                />
              </div>
            </div>
            <div className="ev-img-bot">
              <div className="ev-bg">
                <Image
                  src={ev.imageUrl}
                  alt=""
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'bottom' }}
                  unoptimized={isUnoptimized(ev.imageUrl)}
                />
              </div>
            </div>
          </div>
          <div className="ev-text">
            <div className="ev-line" />
            <div className="ev-name">{ev.title}</div>
            <div className="ev-meta">
              {ev.date}
              {ev.author ? ` · ${ev.author}` : ''}
            </div>
            {ev.body && <div className="ev-desc">{ev.body}</div>}
            <Link href={ev.href} className="ev-btn">
              Mehr erfahren
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="8" x2="13" y2="8" />
                <polyline points="9,4 13,8 9,12" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Right side preview */}
        <div className="ev-side right" onClick={() => setIdx((idx + 1) % N)}>
          <div className="ev-side-img">
            <Image
              src={right.imageUrl}
              alt={right.imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized={isUnoptimized(right.imageUrl)}
            />
          </div>
          <div className="ev-side-label">{right.title}</div>
        </div>

        <button className="ev-arrow next" onClick={() => setIdx((idx + 1) % N)} aria-label="Weiter">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="5,2 10,7 5,12" />
          </svg>
        </button>
      </div>
    </section>
  );
}
