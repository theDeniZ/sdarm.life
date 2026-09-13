'use client';

import { useTranslations } from 'next-intl';
import type { BibleChapter, ParallelChapter } from '../../lib/bible';
import BibleProjector from './BibleProjector';

interface Props {
  chapter: BibleChapter;
  parallel?: ParallelChapter | null;
}

/**
 * The display window reads the same chapter route as the reader, so this is
 * the one place that can refuse to show text a translation's license marks
 * `allowProjector: false` — `BibleChapterReader`/`BibleParallelReader` hide the
 * button that gets here, but a bookmarked or hand-typed `?projector=1` URL
 * bypasses that. In parallel mode the stricter side wins.
 */
export default function BibleProjectorOnly({ chapter, parallel }: Props) {
  const t = useTranslations('treasures.bible');
  const allowed = parallel
    ? chapter.translation.license.allowProjector &&
      parallel.a.license.allowProjector &&
      parallel.b.license.allowProjector
    : chapter.translation.license.allowProjector;

  if (!allowed) {
    return (
      <div className="bible-projector-blocked" role="alert">
        <p className="bible-projector-blocked__title">{t('projectorNotAllowedTitle')}</p>
        <p className="bible-projector-blocked__body">{t('projectorNotAllowedBody')}</p>
        <button type="button" className="bible-projector-blocked__close" onClick={() => window.close()}>
          {t('close')}
        </button>
      </div>
    );
  }

  return <BibleProjector chapter={chapter} parallel={parallel ?? null} onClose={() => window.close()} isDisplay />;
}
