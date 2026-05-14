import type { Metadata } from 'next';
import Image from 'next/image';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchConfig, r2url, WEB_URL } from '../../lib/api';
import ScriptureVerseSection from '../../components/ScriptureVerseSection';
import GlaubensLongRead, { type GlaubensArticle } from '../../components/GlaubensLongRead';

export const dynamic = 'force-dynamic';

const BASE = WEB_URL;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.about' });
  const canonical = `${BASE}/${locale}/about`;
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical,
      languages: { de: `${BASE}/de/about`, en: `${BASE}/en/about`, 'x-default': `${BASE}/de/about` },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: t('metaTitle'),
      description: t('metaDescription'),
    },
  };
}

function isUnoptimized(url: string) {
  return url.startsWith('https://upload.wikimedia.org') || url.startsWith('https://images.unsplash.com');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChurchDecoration = (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="50" y1="8" x2="50" y2="22" />
    <line x1="43" y1="15" x2="57" y2="15" />
    <polyline points="12,44 50,24 88,44" />
    <line x1="12" y1="44" x2="12" y2="92" />
    <line x1="88" y1="44" x2="88" y2="92" />
    <line x1="12" y1="92" x2="88" y2="92" />
    <rect x="38" y="68" width="24" height="24" />
    <path d="M30 44 L30 62 Q30 68 36 68 L64 68 Q70 68 70 62 L70 44" />
    <line x1="50" y1="44" x2="50" y2="68" />
    <line x1="30" y1="56" x2="70" y2="56" />
  </svg>
);

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.about');

  const config = await fetchConfig();

  const tGlaubens = await getTranslations('web.about.glaubens');
  const articles = tGlaubens.raw('articles') as GlaubensArticle[];

  const imageUrl =
    (config?.about_image_key ? r2url(config.about_image_key, { w: 800 }) : null) ??
    'https://images.unsplash.com/photo-1438232992991-995b671e5cdf?w=800&q=85&fit=crop';
  const imageAlt = config?.about_image_alt ?? t('fallbackImageAlt');

  return (
    <>
      <ConnectedNavbar locale={locale} />

      {/* Full-bleed image hero */}
      <section className="about-cover">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          sizes="100vw"
          priority
          unoptimized={isUnoptimized(imageUrl)}
        />
        <div className="about-cover__overlay" />
        <div className="about-cover__content">
          <h1 className="about-cover__title">{t.rich('heroTitle', { em: (chunks) => <em>{chunks}</em> })}</h1>
        </div>
      </section>

      <GlaubensLongRead
        articles={articles}
        ariaNav={tGlaubens('navAria')}
        ariaOpen={tGlaubens('openAria')}
        ariaClose={tGlaubens('closeAria')}
      />

      <ScriptureVerseSection locale={locale} />

      <ConnectedFooter locale={locale} />
    </>
  );
}
