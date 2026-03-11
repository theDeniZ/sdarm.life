import Image from 'next/image';

const STATIC_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg/1280px-Jennie_Augusta_Brownscombe_-_Thanksgiving_at_Plymouth.jpg';

const STATIC = {
  eye: 'Aktuell 1/3',
  meta: '21.09.2020 · Maksim Korol',
  title: 'Die Reformation und ihre Folgen für Deutschland und die ganze Welt',
  imageUrl: STATIC_IMG,
  imageAlt: 'Historisches Gemälde',
};

export interface HeroPost {
  title: string;
  meta: string;     // pre-formatted "DD.MM.YYYY · Author"
  imageUrl: string;
  imageAlt: string;
}

interface HeroSectionProps {
  post?: HeroPost;
}

export default function HeroSection({ post }: HeroSectionProps) {
  const data = post ?? STATIC;

  return (
    <>
      <div className="page">
        <div className="hero">
          <div className="hero-eye">{!post ? STATIC.eye : 'Aktuell'}</div>
          <div className="hero-meta">{data.meta}</div>
          <h1>{data.title}</h1>
        </div>
      </div>

      {/* Full-bleed banner — bleeds outside .page padding */}
      <div className="hero-banner">
        <Image
          id="heroImg"
          src={data.imageUrl}
          alt={data.imageAlt}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
          priority
          unoptimized={data.imageUrl.startsWith('https://upload.wikimedia.org')}
        />
      </div>
    </>
  );
}
