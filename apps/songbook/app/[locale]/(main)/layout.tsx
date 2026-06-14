import { ConnectedFooter } from '@sdarm/ui';

export default async function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <>
      {children}
      <ConnectedFooter locale={locale} />
    </>
  );
}
