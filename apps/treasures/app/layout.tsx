import '@sdarm/ui/src/styles/index.css';
import './globals.css';
import { getLocale } from 'next-intl/server';
import { ThemeScript } from '@sdarm/ui';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
