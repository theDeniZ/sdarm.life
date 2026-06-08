'use client';

import type { BibleChapter, ParallelChapter } from '../../lib/bible';
import BibleProjector from './BibleProjector';

interface Props {
  chapter: BibleChapter;
  parallel?: ParallelChapter | null;
}

export default function BibleProjectorOnly({ chapter, parallel }: Props) {
  return <BibleProjector chapter={chapter} parallel={parallel ?? null} onClose={() => window.close()} isDisplay />;
}
