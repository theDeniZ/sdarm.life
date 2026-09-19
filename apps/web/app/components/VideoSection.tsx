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
    // Empty on purpose: these were hotlinked Unsplash photos, which put the
    // visitor's IP on a third-party CDN on page view (docs/dsgvo.md, gap 2).
    // Drop a real image in as an R2 key or a file under `public/` — the render
    // is guarded, so an empty string simply shows no picture.
    imageUrl: '',
    imageAlt: 'Predigt',
    href: '#',
  },
  {
    id: '2',
    title: 'Der Sabbat — Zeichen des ewigen Bundes zwischen Gott und seinem Volk',
    meta: 'Gemeinde sdarm.life',
    imageUrl: '',
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
                {v.imageUrl && (
                  <Image
                    src={v.imageUrl}
                    alt={v.imageAlt}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                )}
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
