import Image from 'next/image';

const STATIC = {
  text1: 'sdarm.life ist der lokale Onlineauftritt der Siebenten-Tags-Adventisten Reformationsbewegung in Deutschland — Teil der weltweiten Gemeinschaft unter sdarm.org.',
  text2: 'Unsere Gemeinde entstand als Ort der geistlichen Erneuerung — für Menschen, die biblische Wahrheit, den Sabbat und die Botschaft der Reformation ernst nehmen.',
  imageUrl: 'https://images.unsplash.com/photo-1438232992991-995b671e5cdf?w=800&q=85&fit=crop',
  imageAlt: 'Gemeinde betet',
  linkUrl: 'https://sdarm.org/about-us/',
};

export interface AboutConfig {
  about_text_1?: string | null;
  about_text_2?: string | null;
  about_image_url?: string | null;
  about_image_alt?: string | null;
  about_link_url?: string | null;
}

interface AboutSectionProps {
  config?: AboutConfig;
}

export default function AboutSection({ config }: AboutSectionProps) {
  const text1    = config?.about_text_1   ?? STATIC.text1;
  const text2    = config?.about_text_2   ?? STATIC.text2;
  const imageUrl = config?.about_image_url ?? STATIC.imageUrl;
  const imageAlt = config?.about_image_alt ?? STATIC.imageAlt;
  const linkUrl  = config?.about_link_url  ?? STATIC.linkUrl;

  return (
    <div id="ueber-uns" className="section-block">
      <div className="section-label">Über uns</div>
      <div>
        <div className="about-grid">
          <a className="img16" href="https://sdarm.life" style={{ position: 'relative' }}>
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized={imageUrl.includes('unsplash.com')}
            />
          </a>
          <div className="about-text" style={{ alignSelf: 'center' }}>
            <p>{text1}</p>
            <p>{text2}</p>
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="red-link"
            >
              Mehr erfahren → sdarm.org
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
