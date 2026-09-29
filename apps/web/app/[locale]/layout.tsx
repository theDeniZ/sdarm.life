import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@sdarm/i18n';
import type { Locale } from '@sdarm/i18n';
import { ThemeProvider, siteOpenGraph } from '@sdarm/ui';
import { API, WEB_URL } from '../lib/api';

const BASE = WEB_URL;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.metadata' });

  // Canonical/hreflang and og:url are per page (see page.tsx): set here, every
  // page without its own would declare itself a duplicate of the home page.
  return {
    metadataBase: new URL(BASE),
    title: {
      default: t('title'),
      template: `%s – sdarm.life`,
    },
    description: t('description'),
    keywords: t('keywords'),
    openGraph: siteOpenGraph({
      app: 'web',
      base: BASE,
      api: API,
      locale,
      title: t('title'),
      description: t('description'),
      ogTitle: t('ogTitle'),
      ogDescription: t('ogDescription'),
    }),
    twitter: { card: 'summary_large_image' },
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
    <>
      <ThemeProvider />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }} />
      <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
    </>
  );
}
