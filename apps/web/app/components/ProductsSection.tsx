'use client';
import Image from 'next/image';

export interface Product {
  id: string;
  imageUrl: string;
  imageAlt: string;
  author: string;
  bookTitle: string;
  title: string;
  meta: string;
  excerpt: string;
  readHref?: string;
  orderHref?: string;
}

const STATIC_PRODUCTS: Product[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&q=85&fit=crop',
    imageAlt: 'Der Große Kampf',
    author: 'Ellen G. White',
    bookTitle: 'Der Große Kampf',
    title: 'Der Große Kampf zwischen Christus und Satan',
    meta: 'Ellen G. White · Klassiker',
    excerpt: 'Das umfassendste Werk über den Konflikt zwischen Gut und Böse — von der Zerstörung Jerusalems bis zur neuen Erde.',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=85&fit=crop',
    imageAlt: 'Schritte zu Christus',
    author: 'Ellen G. White',
    bookTitle: 'Schritte zu Christus',
    title: 'Schritte zu Christus — Weg zur persönlichen Gemeinschaft mit Gott',
    meta: 'Ellen G. White · Weltweiter Bestseller',
    excerpt: 'Das meistgelesene Buch von Ellen White — ein klarer, einfühlsamer Weg zu einem lebendigen Glauben.',
  },
  // {
  //   id: '3',
  //   imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=85&fit=crop',
  //   imageAlt: 'Sabbatschullektion',
  //   author: 'SDARM · 2026 Q1',
  //   bookTitle: 'Highlights from the Minor Prophets',
  //   title: 'Sabbatschullektion 2026 Q1 — Highlights from the Minor Prophets',
  //   meta: 'sdarm.org · aktuell Jan–März 2026',
  //   excerpt: 'Die aktuelle Bibelstunde der Reformationsbewegung — tiefe Einblicke in die kleinen Propheten.',
  //   readHref: 'https://sdarm.org/publications/senior-division/',
  //   orderHref: 'https://sdarm.org/publications/senior-division/',
  // },
  // {
  //   id: '4',
  //   imageUrl: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=85&fit=crop',
  //   imageAlt: 'Reformation Herald',
  //   author: 'SDARM Magazine',
  //   bookTitle: 'The Reformation Herald',
  //   title: 'The Reformation Herald — Aktuelle Ausgabe 2024/2025',
  //   meta: 'sdarm.org · Magazin',
  //   excerpt: 'Das offizielle Magazin der Reformationsbewegung mit Artikeln, Zeugnissen und aktuellen Themen aus aller Welt.',
  //   readHref: 'https://sdarm.org/publications/rmrh/',
  // },
];

interface ProductsSectionProps {
  products?: Product[];
}

export default function ProductsSection({ products = STATIC_PRODUCTS }: ProductsSectionProps) {
  return (
    <div id="produkte" className="section-block">
      <div className="section-label">Produkte</div>
      <div>
        <div className="products-grid">
          {products.map((p) => (
            <div key={p.id} className="product-card">
              <div className="book-cover" style={{ position: 'relative' }}>
                <Image
                  src={p.imageUrl}
                  alt={p.imageAlt}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="book-overlay">
                  <div className="b-author">{p.author}</div>
                  <div className="b-title">{p.bookTitle}</div>
                </div>
              </div>
              <div className="p-info">
                <h3>{p.title}</h3>
                <div className="p-meta">{p.meta}</div>
                <div className="p-excerpt">{p.excerpt}</div>
                <div className="p-actions">
                  <button
                    className="btn-read"
                    onClick={() => p.readHref && window.open(p.readHref, '_blank')}
                  >
                    Lesen
                  </button>
                  <button
                    className="btn-order"
                    onClick={() => p.orderHref && window.open(p.orderHref, '_blank')}
                  >
                    Bestellen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <a
          href="https://sdarm.org/publications/"
          target="_blank"
          rel="noopener noreferrer"
          className="red-link"
        >
          Mehr Produkte → sdarm.org
        </a>
      </div>
    </div>
  );
}
