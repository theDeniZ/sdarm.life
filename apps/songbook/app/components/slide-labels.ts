// Projector slide labels keyed by the SONG's language (song.songbook.language),
// not the UI locale — a Russian song must show Припев/Аминь regardless of
// whether the operator's browser runs in de or en.

const CHORUS_LABEL: Record<string, string> = {
  ru: 'Припев',
  de: 'Ref',
  en: 'Ref',
};

const AMEN_LABEL: Record<string, string> = {
  ru: 'Аминь',
  de: 'Amen',
  en: 'Amen',
};

export function chorusLabel(language: string): string {
  return CHORUS_LABEL[language] ?? 'Ref';
}

export function amenLabel(language: string): string {
  return AMEN_LABEL[language] ?? 'Amen';
}
