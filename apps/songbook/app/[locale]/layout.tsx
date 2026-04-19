import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ConnectedNavbar, ThemeProvider } from '@sdarm/ui';
import { SONGBOOK_LOCALES, type SongbookLocale } from '../../i18n/routing';
import TelegramBoot from '../components/TelegramBoot';

export function generateStaticParams() {
  return SONGBOOK_LOCALES.map((locale) => ({ locale }));
}

// Mini App: cover the safe-area + notch on iPhone, prevent zoom on input focus
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

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
  if (!SONGBOOK_LOCALES.includes(locale as SongbookLocale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Telegram Mini App SDK — exposes window.Telegram.WebApp inside Telegram clients */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <ThemeProvider />
        <TelegramBoot />
        <NextIntlClientProvider messages={messages}>
          <ConnectedNavbar locale={locale} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
