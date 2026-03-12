import Image from 'next/image';

export interface VideoPost {
  id: string;
  title: string;
  meta: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

const STATIC_VIDEOS: VideoPost[] = [
  {
    id: '1',
    title: 'Reformationsbewegung: Zeugnis aus Deutschland — Gemeindebericht 2024',
    meta: 'sdarm.life · 2024',
    imageUrl: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=85&fit=crop',
    imageAlt: 'Predigt',
    href: '#',
  },
  {
    id: '2',
    title: 'Der Sabbat — Zeichen des ewigen Bundes zwischen Gott und seinem Volk',
    meta: 'Gemeinde sdarm.life',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=85&fit=crop',
    imageAlt: 'Sonnenaufgang Landschaft',
    href: '#',
  },
];

interface VideoSectionProps {
  videos?: VideoPost[];
}

export default function VideoSection({ videos = STATIC_VIDEOS }: VideoSectionProps) {
  return (
    <div id="video" className="section-block">
      <div className="section-label">Video</div>
      <div>
        <div className="video-grid">
          {videos.map((v) => (
            <div key={v.id} className="video-card">
              <a
                className="img16"
                href={v.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ position: 'relative' }}
              >
                <Image
                  src={v.imageUrl}
                  alt={v.imageAlt}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="play-over">
                  <div className="play-circle" />
                </div>
              </a>
              <h3>{v.title}</h3>
              <div className="meta">{v.meta}</div>
            </div>
          ))}
        </div>
        <a href="#" className="red-link">
          Mehr Videos →
        </a>
      </div>
    </div>
  );
}
