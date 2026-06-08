import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHero } from '@sdarm/ui';
import { fetchBooks, fetchTranslation } from '../../../lib/bible';
import BibleBookIndex from '../../../components/bible/BibleBookIndex';

const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };

export default async function TranslationBooksPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('treasures.bible');

  const [translation, books] = await Promise.all([fetchTranslation(code), fetchBooks(code)]);
  if (!translation || books.length === 0) notFound();

  return (
    <>
      <PageHero
        eyebrow={LANG_LABEL[translation.language] ?? translation.language.toUpperCase()}
        title={translation.name}
        subtitle={translation.description ?? undefined}
      />

      <div className="bible-back">
        <Link href={`/${locale}/bible`} className="bible-back-link">
          ← {t('back')}
        </Link>
      </div>

      <BibleBookIndex locale={locale} translationCode={code} books={books} />
    </>
  );
}
