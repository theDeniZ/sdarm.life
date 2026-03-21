import { ConnectedNavbar, ConnectedFooter } from '@sdarm/ui';

export default async function LegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      <ConnectedNavbar locale={locale} />
      {children}
      <ConnectedFooter locale={locale} />
    </>
  );
}
