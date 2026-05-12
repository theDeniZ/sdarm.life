import '@sdarm/ui/src/styles/index.css';
import './globals.css';
import { getLocale } from 'next-intl/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="light">
      <body>{children}</body>
    </html>
  );
}
