import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@sdarm/i18n';
import type { Locale } from '@sdarm/i18n';
import { ConnectedNavbar, ConnectedFooter, ThemeProvider } from '@sdarm/ui';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'events.metadata' });
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
    <html lang={locale} data-theme="light">
      <body>
        <ThemeProvider />
        <NextIntlClientProvider messages={messages}>
          <ConnectedNavbar locale={locale} />
          {children}
          <ConnectedFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
