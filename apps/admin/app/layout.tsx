import type { Metadata } from 'next';
/* One stylesheet per admin domain, named after the folders in app/domains/
   (plus the shared shell pieces). Each file carries its own @media blocks.

   Imported here rather than @import-ed from a single globals.css: Turbopack
   does not invalidate its CSS cache when a file reached through a CSS @import
   changes, so edits only appear after `rm -rf .next` (see apps/web/app/layout.tsx).
   Imported as modules they hot-reload normally. Order here is the cascade order —
   it is the order the sections had in the old single file, so keep new files
   in a place where no later file overrides them by accident. */
import './styles/theme.css';
/* The site's wordmark, shared with every public app (the admin takes only this
   file from @sdarm/ui's design system). */
import '@sdarm/ui/src/styles/wordmark.css';
import './styles/sidebar.css';
import './styles/shell.css';
import './styles/buttons.css';
import './styles/table.css';
import './styles/forms.css';
import './styles/images.css';
import './styles/config.css';
import './styles/states.css';
import './styles/songbooks.css';
import './styles/api-keys.css';
import './styles/modal.css';
import './styles/song-editor.css';
import './styles/dashboard.css';
import './styles/statistics.css';
import './styles/bible.css';
import './styles/home-grid.css';
import './styles/email.css';
import AdminShell from './components/AdminShell';

/* Runs in <head> before first paint, so a collapsed sidebar is collapsed from
   the first frame instead of painting at full width and snapping shut after
   hydration. The key is SIDEBAR_KEY in components/Sidebar.tsx. */
const sidebarScript = `try{if(localStorage.getItem('sdarm-admin-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}`;

export const metadata: Metadata = {
  title: 'Admin — sdarm.life',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script above may set data-sidebar on <html>
    // before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      </head>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
