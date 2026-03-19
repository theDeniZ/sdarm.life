import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConnectedNavbar />
      {children}
      <ConnectedFooter />
    </>
  );
}
