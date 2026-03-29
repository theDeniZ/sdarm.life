import type { Metadata } from 'next';
import './globals.css';
import AdminShell from './components/AdminShell';

export const metadata: Metadata = {
  title: 'Admin — sdarm.life',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
