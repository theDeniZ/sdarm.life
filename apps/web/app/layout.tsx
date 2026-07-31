import '@sdarm/ui/src/styles/index.css';

/* One stylesheet per section/page. Each file owns everything for that section —
   base rules, @media breakpoints and [data-theme='light'] overrides — so a
   section is changed in one place instead of four.

   These are imported here rather than @import-ed from a single globals.css:
   Turbopack does not invalidate its CSS cache when a file reached through a
   CSS @import changes, so edits only appear after `rm -rf .next`. Imported as
   modules they hot-reload normally. Order here is the cascade order.

   styles/uber-uns.css is intentionally absent — UberUnsSection.tsx exists but
   is not rendered anywhere. Add the import to re-enable it. */
import './styles/fonts.css';
import './styles/hero-welcome.css';
import './styles/news.css';
import './styles/quote-share.css';
import './styles/glaubens.css';
import './styles/post.css';
import './styles/legal.css';
import './styles/about.css';
import './styles/kontakt.css';
import './styles/not-found.css';

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
