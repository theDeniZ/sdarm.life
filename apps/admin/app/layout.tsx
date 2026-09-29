import type { Metadata } from 'next';
import './globals.css';
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
