'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { licenseNotice, type BibleLicense } from '../../lib/bible';

interface Props {
  /** One entry per translation whose text is on screen. */
  sources: { name: string; license: BibleLicense }[];
}

/**
 * The notice that every reader page showing verse text must carry. (The
 * projector prints its own, one line under each translation's text — see
 * `ProjectorSlide` — with no register link, because a link on the projector
 * is a way to navigate the room's screen away from scripture mid-service.)
 *
 * `licenseNotice()` decides what to show; this only decides where. The text is
 * printed exactly as the API delivered it — a rights holder's wording is a
 * license condition, not copy we may tighten. The translation name is prefixed
 * only when two translations share the screen, where an unlabelled pair of
 * notices would not say which belongs to which.
 */
export default function BibleLicenseNotice({ sources }: Props) {
  const t = useTranslations('treasures.bible');
  const locale = useLocale();

  const items = sources
    .map((s) => ({ name: s.name, text: licenseNotice(s.license) }))
    .filter((s): s is { name: string; text: string } => !!s.text);
  if (items.length === 0) return null;

  const labelled = items.length > 1;

  return (
    <aside className="bible-copyright" aria-label={t('licenseNoticeAria')}>
      {items.map((it) => (
        <span key={it.name} className="bible-copyright__item">
          {labelled && <strong className="bible-copyright__source">{it.name}</strong>}
          {it.text}
        </span>
      ))}
      <Link href={`/${locale}/bible/licenses`} className="bible-copyright__link">
        {t('licenseRegisterLink')}
      </Link>
    </aside>
  );
}
