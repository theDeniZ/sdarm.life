import type { Metadata } from 'next';
import '@sdarm/ui/src/styles/index.css';
import './globals.css';
import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';

export const metadata: Metadata = {
  title: 'Events — SDARM',
  description: 'Siebenten-Tags-Adventisten Reformationsbewegung — Veranstaltungen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <ConnectedNavbar />
        {children}
        <ConnectedFooter />
      </body>
    </html>
  );
}
