import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales } from '@sdarm/i18n';
import SblApp from '../../components/sbl/SblApp';

const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';

/* Locally the engine asks its own origin and next.config.ts rewrites that to the
   Worker, so the app needs one forwarded port instead of two. In production it
   calls the API host directly, as every other page here does. */
const CLIENT_API = API.includes('localhost') || API.includes('127.0.0.1') ? '/api/v1' : API;

/* the same constant sitemap.ts uses, and hardcoded for the same reason: this is
   the app's own public address, not something an environment varies */
const BASE = 'https://treasures.sdarm.life';

/* The title and description follow the site's locale, like every other page
   here. The lesson's own language is a setting of the sheet and is not known
   until the browser reads it back — a crawler and a link preview get the
   language of the address they were given. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'treasures.sections.sbl' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${BASE}/${locale}/sbl`,
      languages: Object.fromEntries(locales.map((l) => [l, `${BASE}/${l}/sbl`])),
    },
    openGraph: {
      type: 'article',
      title: t('title'),
      description: t('description'),
      url: `${BASE}/${locale}/sbl`,
    },
  };
}

/* Rendered per request: API_URL is a Worker `var`, and a statically generated
   page would freeze whatever value the build machine had. */
export const dynamic = 'force-dynamic';

/* The locale in the URL is the site's (de/en) and decides the navigation's
   language only. The lesson's own language — de, en or ru — is a setting of the
   sheet, kept in localStorage, and governs the lesson text, the Bible edition
   and every label on it. The two are deliberately not tied: there is no Russian
   locale on this site, and the Russian lesson is one of the three the booklet is
   published in. */
export default async function SblPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  /* No navbar here: `[locale]/layout.tsx` already renders one and wraps this in
     <main>. Adding a second put two <nav aria-label="Hauptnavigation"> landmarks
     on the page — invisible on screen, because they stack exactly, and caught
     by the axe check as a duplicate landmark. */
  return (
    <div className="sbl">
      <SblApp apiUrl={CLIENT_API} />
    </div>
  );
}
