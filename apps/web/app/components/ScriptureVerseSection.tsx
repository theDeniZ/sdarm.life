import { getTranslations } from 'next-intl/server';
import { ScriptureVerseSection as SharedScriptureVerseSection } from '@sdarm/ui';
import { pickVerse } from '../lib/verses';

export default async function ScriptureVerseSection({
  href,
  locale,
  hourOfWeek,
}: {
  href?: string;
  locale?: string;
  /** Overrides the clock for screenshot tests — parsed from `?screenshotVerse=`. */
  hourOfWeek?: number;
}) {
  const resolvedLocale = locale ?? 'de';
  const t = await getTranslations({ locale: resolvedLocale, namespace: 'web.verse' });
  const verse = pickVerse(resolvedLocale, hourOfWeek);
  return <SharedScriptureVerseSection eyebrow={t('eyebrow')} text={verse.text} reference={verse.ref} href={href} />;
}
