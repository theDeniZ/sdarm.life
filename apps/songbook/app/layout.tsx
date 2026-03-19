import type { Metadata } from 'next';
import '@sdarm/ui/src/styles/index.css';
import './globals.css';
import { ConnectedNavbar } from '@sdarm/ui';

export const metadata: Metadata = {
  title: 'Liederbuch — SDARM',
  description: 'Siebenten-Tags-Adventisten Reformationsbewegung — Liederbuch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <ConnectedNavbar />
        {children}
      </body>
    </html>
  );
}
