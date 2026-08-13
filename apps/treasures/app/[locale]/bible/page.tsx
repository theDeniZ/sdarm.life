import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHero } from '@sdarm/ui';
import { fetchTranslations } from '../../lib/bible';
import ContinueReadingBar from '../../components/bible/ContinueReadingBar';

const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };

export default async function BibleLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('treasures.bible');

  const translations = await fetchTranslations();

  return (
    <>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
        subtitle={t('subtitle')}
      />

      <ContinueReadingBar />

      <section className="bible-translations" aria-label={t('pickTranslation')}>
        <h2 className="bible-section-title">{t('pickTranslation')}</h2>
        {translations.length === 0 && <p className="bible-empty">{t('noTranslations')}</p>}
        <div className="bible-translations-grid">
          {translations.map((tr) => (
            <Link key={tr.code} href={`/${locale}/bible/${tr.code}`} className="bible-translation-card">
              <span className="bible-translation-lang">{LANG_LABEL[tr.language] ?? tr.language.toUpperCase()}</span>
              <span className="bible-translation-name">{tr.name}</span>
              <span className="bible-translation-year">
                {tr.abbreviation}
                {tr.year > 0 && <> · {tr.year}</>}
              </span>
              {tr.copyright && <span className="bible-translation-desc">{tr.copyright}</span>}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
