import SongEditor from '../../domains/songbooks/SongEditor';
import type { SongDto } from '@sdarm/types';

const MOCK_SONG: SongDto = {
  id: 6547,
  number: 1,
  title: 'Щастя не ховається',

  author: 'Екатерина Лихачёва',
  copyright: null,
  songbook: { id: 42, title: 'Breezify', slug: 'breezify', language: 'ru' },
  parts: [
    {
      id: 1,
      type: 'verse',
      label: 'Verse 1',
      sortOrder: 0,
      lyrics:
        'Коли в [Em]мене запитають:\nЧи існує щастя десь?\nЯк дійти до того краю,\nДе потіха для сердець.\nДе не [Em]ллються тихо сльози\nВід гріха і марноти?\nЯ ска[C]жу, що щастя в Бозі\nЯ знай[Am]шла і зн[H7]айдеш [Em]ти.',
      language: null,
      translationType: 'original',
    },
    {
      id: 2,
      type: 'chorus',
      label: 'Припев',
      sortOrder: 1,
      lyrics:
        'Щастя не [Em]ховається, щастя не тік[C]ає!\nЩастя укр[H7]ивається в Господа руц[Em]і.\nСерце що стиск[Am]ається, серце що шук[Em]ає,\nЩастям наповн[H7]яється тільки у Христ[Em]і.',
      language: null,
      translationType: 'original',
    },
    {
      id: 3,
      type: 'verse',
      label: 'Verse 2',
      sortOrder: 2,
      lyrics:
        'Коли в [Em]мене запитають,\nДе любові джерело?\nЗвідки сили я черпаю,\nЩоб робити всім добро?\nДе на[Em]дія не вмирає,\nІ де мрія ожива?\nВідпо[C]вім, що на Голгофі\nДже[Am]рело я [H7]це знайш[Em]ла!',
      language: null,
      translationType: 'original',
    },
  ],
  sheets: [],
  createdAt: '2026-04-19T00:00:00.000Z',
  updatedAt: '2026-04-19T00:00:00.000Z',
};

export default function DevSongPreviewPage() {
  return (
    <>
      <div
        style={{
          marginBottom: 16,
          padding: '8px 12px',
          border: '1px dashed var(--border-2)',
          borderRadius: 'var(--r)',
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        DEV PREVIEW — mock data, autosave will show "error" (API disabled in this container)
      </div>
      <SongEditor song={MOCK_SONG} />
    </>
  );
}
