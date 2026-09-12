import Link from 'next/link';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHero } from '@sdarm/ui';
import { fetchTranslations, type BibleLicense } from '../../../lib/bible';

const BASE = 'https://treasures.sdarm.life';
const LANG_LABEL: Record<string, string> = { ru: 'RU', de: 'DE', en: 'EN' };
const BASIS_KEY: Record<BibleLicense['basis'], string> = {
  'public-domain': 'licenseBasis_publicDomain',
  permission: 'licenseBasis_permission',
  provider: 'licenseBasis_provider',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('treasures.bible');
  const canonical = `${BASE}/${locale}/bible/licenses`;
  return {
    title: t('licenseRegisterTitle'),
    description: t('licenseRegisterSubtitle'),
    alternates: {
      canonical,
      languages: {
        de: `${BASE}/de/bible/licenses`,
        en: `${BASE}/en/bible/licenses`,
        'x-default': `${BASE}/de/bible/licenses`,
      },
    },
  };
}

/**
 * The public exhibit of every enabled translation's rights position — name,
 * rights holder, license basis, and the verbatim notice/provenance. Reuses the
 * translations list the landing page already fetches; no per-translation
 * request (see the crawl-budget note in docs/frontend.md).
 *
 * `permissionRef`/`permissionDate` are Admin-only fields on
 * `BibleAdminTranslationDto` and are not part of the public `BibleLicenseDto` —
 * this page cannot show them without exposing an admin-only field publicly.
 */
export default async function BibleLicensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('treasures.bible');

  const translations = await fetchTranslations();

  return (
    <>
      <PageHero
        eyebrow={t('licenseRegisterEyebrow')}
        title={t('licenseRegisterTitle')}
        subtitle={t('licenseRegisterSubtitle')}
      />

      <div className="bible-back">
        <Link href={`/${locale}/bible`} className="bible-back-link">
          ← {t('back')}
        </Link>
      </div>

      <section className="bible-license-register" aria-label={t('licenseRegisterTitle')}>
        {translations.length === 0 && <p className="bible-empty">{t('noTranslations')}</p>}
        <ol className="bible-license-list">
          {translations.map((tr) => (
            <li key={tr.id} className="bible-license-entry">
              <div className="bible-license-entry__head">
                <span className="bible-translation-lang">{LANG_LABEL[tr.language] ?? tr.language.toUpperCase()}</span>
                <h2 className="bible-license-entry__name">{tr.name}</h2>
                <span className="bible-license-entry__meta">
                  {tr.abbreviation}
                  {tr.year > 0 && <> · {tr.year}</>}
                </span>
              </div>
              <dl className="bible-license-entry__facts">
                <div>
                  <dt>{t('licenseRightsHolder')}</dt>
                  <dd>{tr.license.rightsHolder ?? t('licenseNoRightsHolder')}</dd>
                </div>
                <div>
                  <dt>{t('licenseBasisLabel')}</dt>
                  <dd>{t(BASIS_KEY[tr.license.basis])}</dd>
                </div>
                {tr.license.notice && (
                  <div>
                    <dt>{t('licenseNoticeLabel')}</dt>
                    <dd className="bible-license-entry__quote">{tr.license.notice}</dd>
                  </div>
                )}
                {tr.license.provenance && (
                  <div>
                    <dt>{t('licenseProvenanceLabel')}</dt>
                    <dd className="bible-license-entry__quote">{tr.license.provenance}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
