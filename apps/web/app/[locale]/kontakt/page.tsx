import type { Metadata } from 'next';
import { ConnectedNavbar, ConnectedFooter, PageHero } from '@sdarm/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchConfig } from '../../lib/api';
import { LOCATIONS, COUNTRY_NAMES, googleMapsUrl, locationsByCountry, type CountryCode } from './data';

export const runtime = 'edge';

const BASE = 'https://sdarm.life';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.kontakt' });
  const canonical = `${BASE}/${locale}/kontakt`;
  return {
    title: t('eyebrow'),
    description: t('heroSubtitle'),
    alternates: {
      canonical,
      languages: { de: `${BASE}/de/kontakt`, en: `${BASE}/en/kontakt`, 'x-default': `${BASE}/de/kontakt` },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title: t('eyebrow'),
      description: t('heroSubtitle'),
    },
  };
}

const ContactDecoration = (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M50 8 C30 8 18 22 18 42 C18 62 50 92 50 92 C50 92 82 62 82 42 C82 22 70 8 50 8 Z" />
    <circle cx="50" cy="42" r="11" />
  </svg>
);

export default async function KontaktPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('web.kontakt');

  const config = await fetchConfig();
  const facebookUrl = config?.facebook_url ?? null;
  const instagramUrl = config?.instagram_url ?? null;
  const youtubeUrl = config?.youtube_url ?? null;
  const whatsappUrl = config?.whatsapp_url ?? null;

  const grouped = locationsByCountry();
  const countries: CountryCode[] = ['DE', 'AT', 'CH'];
  const isDE = locale === 'de';

  // JSON-LD: ItemList of Church entities for SEO
  const churchLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: LOCATIONS.map((loc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Church',
        name: `SDARM ${loc.city}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: loc.street,
          postalCode: loc.postal,
          addressLocality: loc.cityFull ?? loc.city,
          addressCountry: loc.country,
        },
      },
    })),
  };

  return (
    <>
      <ConnectedNavbar locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(churchLd) }} />

      <PageHero
        eyebrow={t('eyebrow')}
        title={t.rich('heroTitle', { em: (chunks) => <em>{chunks}</em> })}
        subtitle={t('heroSubtitle')}
        decoration={ContactDecoration}
        scrollHint={t('scrollHint')}
      />

      {/* ── ONLINE ── */}
      <section className="kontakt-section kontakt-online">
        <header className="kontakt-section-head">
          <p className="kontakt-section-eyebrow">{t('onlineEyebrow')}</p>
          <h2 className="kontakt-section-title">{t('onlineTitle')}</h2>
          <p className="kontakt-section-sub">{t('onlineSubtitle')}</p>
        </header>

        <div className="kontakt-online-card">
          <a href="mailto:info@sdarm.life" className="kontakt-email">
            info@sdarm.life
          </a>

          <div className="kontakt-social">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
            {youtubeUrl && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                  <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </a>
            )}
            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── VOR ORT ── */}
      <section className="kontakt-section kontakt-vor-ort">
        <header className="kontakt-section-head">
          <p className="kontakt-section-eyebrow">{t('vorOrtEyebrow')}</p>
          <h2 className="kontakt-section-title">{t.rich('vorOrtTitle', { em: (chunks) => <em>{chunks}</em> })}</h2>
          <p className="kontakt-section-sub">{t('vorOrtSubtitle')}</p>
        </header>

        {countries.map((cc) => {
          const items = grouped[cc];
          if (!items.length) return null;
          const countryName = isDE ? COUNTRY_NAMES[cc].de : COUNTRY_NAMES[cc].en;
          return (
            <div key={cc} className="kontakt-country">
              <div className="kontakt-country-head">
                <span className="kontakt-country-code">{cc}</span>
                <span className="kontakt-country-name">{countryName}</span>
                <span className="kontakt-country-count">{String(items.length).padStart(2, '0')}</span>
              </div>

              <ul className="kontakt-locations-grid">
                {items.map((loc, i) => (
                  <li key={loc.slug} id={loc.slug} className="kontakt-loc-card">
                    <span className="kontakt-loc-num">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="kontakt-loc-city">{loc.city}</h3>
                    {loc.region && <p className="kontakt-loc-region">{loc.region}</p>}
                    <p className="kontakt-loc-address">
                      {loc.street}
                      <br />
                      {loc.postal} {loc.cityFull ?? loc.city}
                    </p>
                    {loc.description && (
                      <p className="kontakt-loc-desc">{isDE ? loc.description.de : loc.description.en}</p>
                    )}
                    <a href={googleMapsUrl(loc)} target="_blank" rel="noopener noreferrer" className="kontakt-loc-link">
                      {t('directions')} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <ConnectedFooter locale={locale} />
    </>
  );
}
