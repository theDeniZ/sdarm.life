import { ConnectedFooter } from '@sdarm/ui';

/**
 * The Bible section is a normal browsing surface, so it carries the site footer
 * like the catalog does. It needs its own layout because `bible/` sits outside
 * the `(main)` route group — `books/[id]` is outside it on purpose (the EPUB
 * reader is a full-screen surface), and the Bible routes must not inherit that.
 *
 * The projector display window (`?projector=1`) renders a fixed full-screen
 * portal over everything, so the footer is never visible there.
 */
export default async function BibleLayout({
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
