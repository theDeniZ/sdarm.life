import type { Metadata } from 'next';

/** Public apps that get a generated site card from `GET /api/v1/og?type=site`. */
export type SiteApp = 'web' | 'songbook' | 'treasures' | 'events';

export interface SiteMetadataInput {
  app: SiteApp;
  /** Production origin of the app, e.g. `https://songs.sdarm.life`. */
  base: string;
  /** API base (`…/api/v1`) that serves the generated OpenGraph card. */
  api: string;
  locale: string;
  title: string;
  description: string;
  /** Social-preview wording, when it differs from the search snippet. */
  ogTitle?: string;
  ogDescription?: string;
}

/** The generated 1200×630 site card for an app (`GET /api/v1/og?type=site`). */
export function siteOgImage(api: string, app: SiteApp, locale: string, alt: string) {
  const lang = locale === 'de' ? 'de' : 'en';
  return { url: `${api}/og?type=site&app=${app}&locale=${lang}`, width: 1200, height: 630, alt };
}

/**
 * Site-level OpenGraph block. No `url`: a layout's `openGraph` is inherited by
 * every child page that does not set its own, and a fixed URL there would claim
 * the home page for all of them. Home pages add `url` themselves.
 */
export function siteOpenGraph(i: SiteMetadataInput): NonNullable<Metadata['openGraph']> {
  const isDE = i.locale === 'de';
  const title = i.ogTitle ?? i.title;
  return {
    type: 'website',
    siteName: 'SDARM.life',
    locale: isDE ? 'de_DE' : 'en_GB',
    alternateLocale: isDE ? ['en_GB'] : ['de_DE'],
    title,
    description: i.ogDescription ?? i.description,
    images: [siteOgImage(i.api, i.app, i.locale, title)],
  };
}

/** Canonical + hreflang alternates for a path that exists in both locales (`''` = home). */
export function localeAlternates(base: string, locale: string, path = ''): NonNullable<Metadata['alternates']> {
  return {
    canonical: `${base}/${locale}${path}`,
    languages: { de: `${base}/de${path}`, en: `${base}/en${path}`, 'x-default': `${base}/de${path}` },
  };
}

/**
 * Metadata for a public app's home page: search snippet, canonical + hreflang,
 * OpenGraph with the page URL, and a large-image Twitter card. Twitter reads
 * title, description and image from the `og:` tags, so only the card type is set.
 */
export function siteHomeMetadata(i: SiteMetadataInput): Metadata {
  const alternates = localeAlternates(i.base, i.locale);
  return {
    title: i.title,
    description: i.description,
    alternates,
    openGraph: { ...siteOpenGraph(i), url: alternates.canonical as string },
    twitter: { card: 'summary_large_image' },
  };
}
