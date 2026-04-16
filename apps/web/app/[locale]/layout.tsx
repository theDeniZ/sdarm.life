import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@sdarm/i18n';
import type { Locale } from '@sdarm/i18n';
import { ThemeProvider } from '@sdarm/ui';
import { WEB_URL } from '../lib/api';

const BASE = WEB_URL;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.metadata' });
  const isDE = locale === 'de';
  const canonical = `${BASE}/${locale}`;

  return {
    metadataBase: new URL(BASE),
    title: {
      default: t('title'),
      template: `%s – sdarm.life`,
    },
    description: t('description'),
    alternates: {
      canonical,
      languages: {
        de: `${BASE}/de`,
        en: `${BASE}/en`,
        'x-default': `${BASE}/de`,
      },
    },
    openGraph: {
      type: 'website',
      locale: isDE ? 'de_DE' : 'en_GB',
      alternateLocale: isDE ? ['en_GB'] : ['de_DE'],
      url: canonical,
      siteName: 'SDARM.life',
      title: t('title'),
      description: t('description'),
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'SDARM.life' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og.png'],
    },
    icons: { icon: '/icon.svg' },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE}/#organization`,
    name:
      locale === 'de'
        ? 'Siebenten-Tags-Adventisten Reformationsbewegung Deutschland'
        : 'Seventh Day Adventist Reform Movement Germany',
    url: BASE,
    logo: { '@type': 'ImageObject', url: `${BASE}/icon.svg` },
    contactPoint: { '@type': 'ContactPoint', email: 'info@sdarm.life', contactType: 'general' },
    sameAs: ['https://sdarm.org'],
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE}/#website`,
    name: 'SDARM.life',
    url: BASE,
    publisher: { '@id': `${BASE}/#organization` },
    inLanguage: ['de', 'en'],
  };

  return (
    <html lang={locale}>
      <body>
        <ThemeProvider />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }} />
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
