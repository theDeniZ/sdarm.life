import type { Metadata } from 'next';
import '@sdarm/ui/src/styles/index.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'sdarm.life',
  description: 'Siebenten-Tags-Adventisten Reformationsbewegung in Deutschland',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
