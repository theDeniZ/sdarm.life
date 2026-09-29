import '@sdarm/ui/src/styles/index.css';

/* One stylesheet per section. Each file owns everything for that section —
   base rules, @media breakpoints and [data-theme='light'] overrides — so a
   section is changed in one place instead of three.

   These are imported here rather than @import-ed from a single globals.css:
   Turbopack does not invalidate its CSS cache when a file reached through a
   CSS @import changes, so edits only appear after `rm -rf .next`. Imported as
   modules they hot-reload normally. Order here is the cascade order. */
import './styles/base.css';
import './styles/songbooks.css';
import './styles/song-list.css';
import './styles/song-view.css';
import './styles/projector.css';
import './styles/presenter.css';
import './styles/sheets.css';
import './styles/reader.css';
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
