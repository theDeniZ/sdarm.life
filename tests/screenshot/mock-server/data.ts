// Mock data for screenshot tests
// All image keys set to null to avoid external image requests

export const mockConfig = {
  donation_url: '#',
  hero_bg_key: null,
  hero_bg_alt: '',
  about_text_1: 'Willkommen zur SDA Reform Bewegung',
  about_text_2: 'Eine Gemeinschaft des Glaubens und der Reform',
  about_image_key: null,
  about_image_alt: '',
  about_link_url: '#',
  facebook_url: '#',
  whatsapp_url: '#',
  instagram_url: '#',
  youtube_url: '#',
};

export const mockSongbook = {
  id: 1,
  slug: 'gesangbuch',
  title: 'Gesangbuch',
  language: 'ru',
  description: 'Reformiertes Liederbuch',
  coverKey: null,
  sortOrder: 1,
  songCount: 2,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockSongList = [
  {
    id: 1,
    number: 1,
    title: 'Wunderbarer König',
    author: 'Hymnist',
    copyright: null,
  },
  {
    id: 2,
    number: 2,
    title: 'Lobe den Herrn',
    author: 'Schöpfer',
    copyright: null,
  },
];

export const mockSong = {
  id: 1,
  number: 1,
  title: 'Wunderbarer König',
  author: 'Hymnist',
  copyright: null,
  songbook: {
    id: 1,
    title: 'Gesangbuch',
    slug: 'gesangbuch',
  },
  parts: [
    {
      id: 1,
      type: 'verse',
      label: 'Vers 1',
      sortOrder: 1,
      lyrics: '[G]Wunderbarer König\n[C]Gott der Gnade\n[G]Licht und Leben',
    },
    {
      id: 2,
      type: 'chorus',
      label: 'Refrain',
      sortOrder: 2,
      lyrics: '[C]Halleluja\n[G]Halleluja',
    },
  ],
  sheets: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockTreasure = {
  id: 1,
  title: 'Wunsch für alle Völker',
  author: null,
  description: 'Ein Werk der Weisheit',
  type: 'book',
  language: 'de',
  coverGradient: null,
  coverAccentColor: null,
  coverKey: null,
  isFree: true,
  price: null,
  sortOrder: 1,
  epubUrl: null,
  epubKey: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockBibleTranslation = {
  id: 51,
  code: 'delut',
  name: 'Lutherbibel 1912',
  abbreviation: 'DELUT',
  language: 'de',
  copyright: null,
  year: 1912,
  lxxPsalms: false,
};

export const mockBibleBooks = [
  { id: 1, code: 'GEN', number: 1, name: '1. Mose', abbreviation: '1. Mose', testament: 'OT', chapterCount: 50 },
  { id: 19, code: 'PSA', number: 19, name: 'Psalmen', abbreviation: 'Psalmen', testament: 'OT', chapterCount: 150 },
  { id: 43, code: 'JHN', number: 43, name: 'Johannes', abbreviation: 'Johannes', testament: 'NT', chapterCount: 21 },
];

export const mockBibleChapter = {
  translation: { code: 'delut', name: 'Lutherbibel 1912', copyright: null },
  book: mockBibleBooks[2],
  chapter: 3,
  verses: [
    { verse: 16, text: 'Also hat Gott die Welt geliebt, daß er seinen eingeborenen Sohn gab.' },
    { verse: 17, text: 'Denn Gott hat seinen Sohn nicht gesandt in die Welt, daß er die Welt richte.' },
  ],
};

export const mockPost = {
  id: 1,
  title: 'Testbeitrag',
  slug: 'test-post',
  excerpt: 'Dies ist ein Test-Artikel',
  body: 'Das ist der Inhalt des Test-Artikels. Er enthält einige Informationen zur Kirche und zum Glauben.',
  author: 'Test Author',
  videoUrl: null,
  coverKey: null,
  coverAlt: '',
  thumbKey: null,
  isFeatured: false,
  publishedAt: '2025-01-01T00:00:00Z',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  deletedAt: null,
};

export const mockPostList = [
  {
    id: 1,
    title: 'Testbeitrag',
    slug: 'test-post',
    excerpt: 'Dies ist ein Test-Artikel',
    body: 'Das ist der Inhalt des Test-Artikels.',
    author: 'Test Author',
    videoUrl: null,
    coverKey: null,
    coverAlt: '',
    thumbKey: null,
    isFeatured: false,
    publishedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    deletedAt: null,
  },
  {
    id: 2,
    title: 'Zweiter Artikel',
    slug: 'zweiter-artikel',
    excerpt: 'Noch ein Test',
    body: 'Weiterer Testinhalt.',
    author: 'Another Author',
    videoUrl: null,
    coverKey: null,
    coverAlt: '',
    thumbKey: null,
    isFeatured: false,
    publishedAt: '2025-01-02T00:00:00Z',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    deletedAt: null,
  },
  {
    id: 3,
    title: 'Dritter Artikel',
    slug: 'dritter-artikel',
    excerpt: 'Noch mehr Tests',
    body: 'Noch mehr Testinhalt für unsere Tests.',
    author: 'Test Author',
    videoUrl: null,
    coverKey: null,
    coverAlt: '',
    thumbKey: null,
    isFeatured: false,
    publishedAt: '2025-01-03T00:00:00Z',
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
    deletedAt: null,
  },
];

/* One Sabbath Bible Lesson quarter.
 *
 * The dates are fixed and the spec freezes the browser clock to 2026-08-19, so
 * the sheet always opens on the same week. Without both halves the baseline
 * would drift: the page picks its lesson from today's date. */
export const mockSblQuarter = {
  title: 'Walking With Jesus',
  publicationType: 'sbl',
  publicationTitle: 'Sabbath Bible Lessons',
  lang: 'en',
  year: 2026,
  quarter: 3,
  lessons: [
    {
      no: '8',
      date: '20260822',
      dateLong: 'Sabbath, August 22, 2026',
      header: 'Lesson 8',
      title: 'Growing Up Into Christ',
      keyText: {
        text: 'Memory verse: “To appoint unto them that mourn in Zion, to give unto them beauty for ashes.”',
        ref: { text: 'Isaiah 61:3', sOsis: 'Isa.61.3' },
      },
      keyNote: { text: '“You are just as dependent upon Christ as is the branch upon the parent stock.”' },
      reading: { label: 'Suggested Reading:', reading: [{ label: 'Steps to Christ, p. 67-75', ref: 'SC/67-75' }] },
      dailyLessons: [
        {
          date: '20260816',
          dayLong: 'Sunday',
          monthDay: 'August 16',
          sectionTitle: '1. KEYS TO GROWTH',
          subsections: [
            {
              q: [
                { text: 'a. How does Scripture illustrate Christian development? ' },
                { text: 'Isaiah 61:3.', sOsis: 'Isa.61.3' },
              ],
              note: [
                {
                  text: '“Not all the wisdom and the skill of man can produce life in the smallest object in nature.”',
                },
              ],
            },
          ],
        },
        {
          date: '20260817',
          dayLong: 'Monday',
          monthDay: 'August 17',
          sectionTitle: '2. ABIDING IN HIM',
          subsections: [
            {
              q: [{ text: 'a. What does it mean to abide in Christ? ' }, { text: 'John 15:4.', sOsis: 'John.15.4' }],
              note: [{ text: '“The life of the vine will be manifest in fragrant fruit on the branches.”' }],
            },
          ],
        },
      ],
    },
  ],
};

/* A Bible edition trimmed to the two passages the fixture lesson quotes. The
 * real file is four megabytes; a screenshot needs two verses. */
export const mockSblBible = {
  id: 'en-kjv',
  version: 'kjv',
  lang: 'en',
  name: 'King James Version',
  books: {
    Isa: [],
    John: [],
  },
};
