export const R2 = process.env.R2_URL ?? 'https://images.sdarm.life';

const TRANSFORMS_ENABLED = process.env.R2_TRANSFORMS !== 'false';

export interface ImageTransform {
  w?: number;
  h?: number;
  q?: number;
}

export function r2url(key: string | null, opts?: ImageTransform): string | null {
  if (!key) return null;
  const base = `${R2}/${key}`;
  if (!opts || !TRANSFORMS_ENABLED || R2.includes('localhost')) return base;
  const params = [opts.w && `w=${opts.w}`, opts.h && `h=${opts.h}`, `f=auto`, `q=${opts.q ?? 80}`]
    .filter(Boolean)
    .join(',');
  return `${R2}/cdn-cgi/image/${params}/${key}`;
}

export type TreasureType = 'book';

export interface Treasure {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  type: TreasureType;
  language: 'ru' | 'de' | 'en';
  coverGradient: string;
  coverAccentColor: string;
  isFree: boolean;
  price: string | null;
  sortOrder: number;
  epubUrl: string | null;
}

export const TREASURES: Treasure[] = [
  {
    id: 1,
    title: 'Путь ко Христу',
    author: 'Ellen G. White',
    description:
      'Знание Бога — основа истинного мира и радости. Эта книга ведёт нас к Христу, открывая путь к истинному покаянию, вере и примирению с Богом.',
    type: 'book',
    language: 'ru',
    coverGradient: 'linear-gradient(145deg, #1a3a2a, #0d2018)',
    coverAccentColor: '#c9a96e',
    isFree: true,
    price: null,
    sortOrder: 1,
    epubUrl: null,
  },
  {
    id: 2,
    title: 'Der Weg zu Christus',
    author: 'Ellen G. White',
    description:
      'Eine zeitlose Einführung in das geistliche Leben. Dieses Buch führt den Leser Schritt für Schritt zu einer tieferen Gemeinschaft mit Christus.',
    type: 'book',
    language: 'de',
    coverGradient: 'linear-gradient(145deg, #1a2a3a, #0d1820)',
    coverAccentColor: '#c9a96e',
    isFree: true,
    price: null,
    sortOrder: 2,
    epubUrl: null,
  },
  {
    id: 3,
    title: 'Die Große Auseinandersetzung',
    author: 'Ellen G. White',
    description:
      'Der große Kampf zwischen Christus und Satan — von der Zerstörung Jerusalems bis zum Ende aller Dinge und dem Triumph der Liebe Gottes.',
    type: 'book',
    language: 'de',
    coverGradient: 'linear-gradient(145deg, #2a1a3a, #180d20)',
    coverAccentColor: '#b08040',
    isFree: true,
    price: null,
    sortOrder: 3,
    epubUrl: null,
  },
  {
    id: 4,
    title: 'Patriarchen und Propheten',
    author: 'Ellen G. White',
    description:
      'Die Geschichte der Entstehung des Bösen und der Patriarchen des Alten Testaments — von Adam bis zu den Tagen Davids.',
    type: 'book',
    language: 'de',
    coverGradient: 'linear-gradient(145deg, #3a2a1a, #201508)',
    coverAccentColor: '#a07850',
    isFree: true,
    price: null,
    sortOrder: 4,
    epubUrl: null,
  },
  {
    id: 5,
    title: 'Steps to Christ',
    author: 'Ellen G. White',
    description:
      'Knowledge of God is the foundation of all true peace and joy. This beloved book leads the reader step by step to a closer walk with Christ.',
    type: 'book',
    language: 'en',
    coverGradient: 'linear-gradient(145deg, #1e3a1a, #0f200d)',
    coverAccentColor: '#c9a96e',
    isFree: true,
    price: null,
    sortOrder: 5,
    epubUrl: null,
  },
  {
    id: 6,
    title: 'Leben Jesu',
    author: 'Ellen G. White',
    description:
      'Das Leben Jesu Christi — von seiner Geburt bis zu Kreuzigung und Auferstehung. Ein zeitloses Meisterwerk der geistlichen Literatur.',
    type: 'book',
    language: 'de',
    coverGradient: 'linear-gradient(145deg, #1a1a3a, #0d0d22)',
    coverAccentColor: '#9090c0',
    isFree: true,
    price: null,
    sortOrder: 6,
    epubUrl: 'https://media2.egwwritings.org/epub/de_LJ(DA).epub',
  },
];
