import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { API } from '../../../../../lib/api';
import {
  fetchBooks,
  fetchChapter,
  fetchParallelChapter,
  fetchTranslation,
  fetchTranslations,
} from '../../../../../lib/bible';
import BibleChapterReader from '../../../../../components/bible/BibleChapterReader';
import BibleParallelReader from '../../../../../components/bible/BibleParallelReader';
import BibleProjectorOnly from '../../../../../components/bible/BibleProjectorOnly';
import BibleUnavailable from '../../../../../components/bible/BibleUnavailable';

const BASE = 'https://treasures.sdarm.life';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string; book: string; chapter: string }>;
}): Promise<Metadata> {
  const { locale, code, book, chapter } = await params;
  const chapterNum = Number(chapter);
  if (!Number.isInteger(chapterNum) || chapterNum < 1) return {};
  const ch = await fetchChapter(code, book, chapterNum);
  if (!ch) return {};

  const title = `${ch.book.name} ${ch.chapter} — ${ch.translation.name}`;
  const firstVerse = ch.verses[0]?.text ?? '';
  const description = firstVerse.slice(0, 200) + (firstVerse.length > 200 ? '…' : '');
  const canonical = `${BASE}/${locale}/bible/${code}/${book}/${chapterNum}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        de: `${BASE}/de/bible/${code}/${book}/${chapterNum}`,
        en: `${BASE}/en/bible/${code}/${book}/${chapterNum}`,
        'x-default': `${BASE}/de/bible/${code}/${book}/${chapterNum}`,
      },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
    },
  };
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; code: string; book: string; chapter: string }>;
  searchParams: Promise<{ compare?: string; projector?: string }>;
}) {
  const { locale, code, book, chapter } = await params;
  const { compare, projector } = await searchParams;
  setRequestLocale(locale);

  const chapterNum = Number(chapter);
  if (!Number.isInteger(chapterNum) || chapterNum < 1) notFound();

  if (projector === '1') {
    if (compare && compare !== code) {
      const [ch, parallel] = await Promise.all([
        fetchChapter(code, book, chapterNum),
        fetchParallelChapter(code, compare, book, chapterNum),
      ]);
      if (!ch) notFound();
      return <BibleProjectorOnly chapter={ch} parallel={parallel} />;
    }
    const ch = await fetchChapter(code, book, chapterNum);
    if (!ch) notFound();
    return <BibleProjectorOnly chapter={ch} />;
  }

  if (compare) {
    const [translationA, translationB, allTranslations, books, parallel] = await Promise.all([
      fetchTranslation(code),
      fetchTranslation(compare),
      fetchTranslations(),
      fetchBooks(code),
      fetchParallelChapter(code, compare, book, chapterNum),
    ]);
    if (!translationA || !translationB || books.length === 0) notFound();
    const bookMeta = books.find((b) => b.code === book);
    if (!bookMeta || chapterNum > bookMeta.chapterCount) notFound();
    if (!parallel) {
      return <BibleUnavailable translationCode={code} bookCode={book} bookName={bookMeta.name} chapter={chapterNum} />;
    }
    return (
      <BibleParallelReader
        translationA={translationA}
        translationB={translationB}
        translations={allTranslations}
        books={books}
        parallel={parallel}
      />
    );
  }

  const [translation, allTranslations, books, ch] = await Promise.all([
    fetchTranslation(code),
    fetchTranslations(),
    fetchBooks(code),
    fetchChapter(code, book, chapterNum),
  ]);
  if (!translation || books.length === 0) notFound();
  const bookMeta = books.find((b) => b.code === book);
  if (!bookMeta || chapterNum > bookMeta.chapterCount) notFound();
  if (!ch) {
    return <BibleUnavailable translationCode={code} bookCode={book} bookName={bookMeta.name} chapter={chapterNum} />;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${ch.book.name} ${ch.chapter} — ${ch.translation.name}`,
    inLanguage: translation.language,
    isPartOf: {
      '@type': 'Book',
      name: translation.name,
      bookEdition: String(translation.year),
      inLanguage: translation.language,
    },
    url: `${BASE}/${locale}/bible/${code}/${book}/${chapterNum}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BibleChapterReader
        translation={translation}
        translations={allTranslations}
        books={books}
        chapter={ch}
        apiUrl={API}
      />
    </>
  );
}
