import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHero, ScriptureVerseSection } from '@sdarm/ui';
import { fetchSongbooks } from '../lib/api';

const MUSIC_NOTE = (
  <svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="22" cy="102" rx="18" ry="12" fill="rgba(201,169,110,0.9)" transform="rotate(-18 22 102)" />
    <ellipse cx="72" cy="86" rx="18" ry="12" fill="rgba(201,169,110,0.9)" transform="rotate(-18 72 86)" />
    <line x1="38" y1="95" x2="38" y2="10" stroke="rgba(201,169,110,0.9)" strokeWidth="3.5" />
    <line x1="88" y1="79" x2="88" y2="10" stroke="rgba(201,169,110,0.9)" strokeWidth="3.5" />
    <line x1="38" y1="10" x2="88" y2="20" stroke="rgba(201,169,110,0.9)" strokeWidth="3.5" />
  </svg>
);

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('songbook.landing');
  const songbooks = await fetchSongbooks();

  return (
    <>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t.rich('title', { em: (chunks) => <em>{chunks}</em> })}
        subtitle={t('subtitle')}
        decoration={MUSIC_NOTE}
        scrollHint={t('discover')}
      />

      <section className="songbooks-section">
        <div className="songbooks-grid">
          {songbooks.map((sb) => (
            <Link key={sb.id} href={`/${locale}/songbooks/${sb.slug}`} className="songbook-landing-card">
              <div className="songbook-landing-card__lang">{sb.language.toUpperCase()}</div>
              <div className="songbook-landing-card__icon">
                <svg viewBox="0 0 24 24">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="songbook-landing-card__name">{sb.title}</div>
              {sb.description && <div className="songbook-landing-card__subtitle">{sb.description}</div>}
              <div className="songbook-landing-card__count">
                {sb.songCount > 0 ? t('songCount', { count: sb.songCount }) : t('openSongbook')}
              </div>
              <span className="songbook-landing-card__arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <ScriptureVerseSection
        text="Singet dem HERRN ein neues Lied; singet dem HERRN, alle Welt!"
        reference="Psalm 96,1"
      />
    </>
  );
}
