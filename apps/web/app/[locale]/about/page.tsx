import Image from 'next/image';
import Link from 'next/link';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchConfig, r2url } from '../../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.about');
  const ct = await getTranslations('common');

  const config = await fetchConfig();

  const text1 = config?.about_text_1 ?? t('fallbackText1');
  const text2 = config?.about_text_2 ?? t('fallbackText2');
  const imageUrl =
    (config?.about_image_key ? r2url(config.about_image_key, { w: 800 }) : null) ??
    'https://images.unsplash.com/photo-1438232992991-995b671e5cdf?w=800&q=85&fit=crop';
  const imageAlt = config?.about_image_alt ?? t('fallbackImageAlt');
  const linkUrl = config?.about_link_url ?? 'https://sdarm.org/about-us/';

  return (
    <>
      <ConnectedNavbar locale={locale} />

      <div className="about-hero">
        <Link href={`/${locale}`} className="post-back">
          {ct('back')}
        </Link>
        <h1>{t('title')}</h1>
        <p className="about-hero-sub">{t('subtitle')}</p>
      </div>

      <div className="about-content">
        <div className="about-grid">
          <div className="about-img">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 600px) 100vw, 50vw"
              unoptimized={isUnoptimized(imageUrl)}
            />
          </div>
          <div className="about-text">
            <div className="about-line" />
            <p>{text1}</p>
            <p>{text2}</p>
            <a href={linkUrl} className="about-link" target="_blank" rel="noopener noreferrer">
              {t('learnMore')}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="8" x2="13" y2="8" />
                <polyline points="9,4 13,8 9,12" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <ConnectedFooter locale={locale} />
    </>
  );
}
