import '@sdarm/ui/src/styles/index.css';

/* One stylesheet per section. Each file owns everything for that section —
   base rules, @media breakpoints and [data-theme='light'] overrides — so a
   section is changed in one place instead of three.

   These are imported here rather than @import-ed from a single globals.css:
   Turbopack does not invalidate its CSS cache when a file reached through a
   CSS @import changes, so edits only appear after `rm -rf .next`. Imported as
   modules they hot-reload normally. Order here is the cascade order.

   The EPUB reader is not here. Its stylesheet (styles/reader/) is imported by
   app/[locale]/books/[id]/layout.tsx alone, so the catalogue does not load it. */
import './styles/base.css';
import './styles/catalog-hero.css';
import './styles/catalog.css';
import './styles/card.css';
import './styles/tome.css';
import './styles/sections.css';
import './styles/quote.css';
import './styles/book-detail.css';
import './styles/book-request.css';
import './styles/bible.css';
import './styles/bible-presenter.css';
import './styles/bible-license.css';
import '@sdarm/ui/src/styles/not-found.css';
import './styles/reduced-motion.css';

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
