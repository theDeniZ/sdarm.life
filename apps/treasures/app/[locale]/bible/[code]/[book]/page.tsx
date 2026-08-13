import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHero } from '@sdarm/ui';
import { fetchBook, fetchTranslation } from '../../../../lib/bible';

export default async function BookChaptersPage({
  params,
}: {
  params: Promise<{ locale: string; code: string; book: string }>;
}) {
  const { locale, code, book } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('treasures.bible');

  const [translation, bookMeta] = await Promise.all([fetchTranslation(code), fetchBook(code, book)]);
  if (!translation || !bookMeta) notFound();

  const chapters = Array.from({ length: bookMeta.chapterCount }, (_, i) => i + 1);

  return (
    <>
      <PageHero
        eyebrow={translation.name}
        title={bookMeta.name}
        subtitle={`${bookMeta.chapterCount} ${t('chapters')}`}
      />

      <div className="bible-back">
        <Link href={`/${locale}/bible/${code}`} className="bible-back-link">
          ← {t('back')}
        </Link>
      </div>

      <section className="bible-chapter-grid-section" aria-label={t('ariaChapterNav')}>
        <div className="bible-chapter-grid">
          {chapters.map((n) => (
            <Link
              key={n}
              href={`/${locale}/bible/${code}/${book}/${n}`}
              className="bible-chapter-cell"
              aria-label={t('chapter', { n })}
            >
              {n}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
