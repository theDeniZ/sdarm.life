import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@sdarm/i18n';
import type { Locale } from '@sdarm/i18n';
import { ConnectedNavbar, ThemeProvider } from '@sdarm/ui';
import EmbedBoot from '../components/EmbedBoot';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'songbook.metadata' });
  return {
    title: t('title'),
    description: t('description'),
    icons: { icon: '/icon.svg' },
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

  return (
    <html lang={locale}>
      <body>
        {/* Pre-hydration embed class: if ?embed=1 is in the URL, tag <html>
            synchronously so the first paint already hides the chrome. Avoids
            the flash of full-site UI inside Telegram's WebView before React
            hydrates. EmbedBoot still adds the class from Telegram WebApp
            initData for cases where ?embed=1 is lost (locale redirects). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('embed')}catch(e){}",
          }}
        />
        {/* Telegram Mini App SDK — populates window.Telegram.WebApp inside Telegram clients.
            Outside Telegram it's a tiny no-op script. EmbedBoot uses it to detect
            "we're inside Telegram" and force embed mode even when ?embed=1 is missing
            (e.g. lost across a locale redirect). */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <ThemeProvider />
        {/* Adds .embed class on <html> when ?embed=1 OR running inside Telegram —
            CSS in globals.css then strips everything except .reader-content. */}
        <Suspense fallback={null}>
          <EmbedBoot />
        </Suspense>
        <NextIntlClientProvider messages={messages}>
          <ConnectedNavbar locale={locale} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
