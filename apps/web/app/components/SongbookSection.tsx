export interface Song {
  id: string;
  num: string;
  title: string;
  tag: string;
  firstLine: string;
}

const STATIC_SONGS: Song[] = [
  {
    id: '1',
    num: '№ 1',
    title: 'Heilig, heilig, heilig',
    tag: 'Lobpreis · Reginald Heber',
    firstLine: 'Heilig, heilig, heilig! Herr, allmächtiger Gott! Früh am Morgen steigt unser Lied zu Dir empor...',
  },
  {
    id: '2',
    num: '№ 2',
    title: 'Ein feste Burg ist unser Gott',
    tag: 'Reformation · Martin Luther',
    firstLine: 'Ein feste Burg ist unser Gott, ein gute Wehr und Waffen. Er hilft uns frei aus aller Not...',
  },
  {
    id: '3',
    num: '№ 3',
    title: 'Amazing Grace',
    tag: 'Gnade · John Newton',
    firstLine: 'Amazing grace, how sweet the sound that saved a wretch like me...',
  },
  // { id: '4', num: '№ 4', title: 'In Christ Alone', tag: 'Christologie · Townend / Getty', firstLine: 'In Christ alone my hope is found, He is my light, my strength, my song...' },
  // { id: '5', num: '№ 5', title: 'Wie groß bist du', tag: 'Anbetung · Carl Boberg', firstLine: 'O Herr mein Gott, wenn ich in Ehrfurcht staune über all das, was deine Hand erschuf...' },
  // { id: '6', num: '№ 6', title: 'Come Thou Fount', tag: 'Hingabe · Robert Robinson', firstLine: 'Come, Thou Fount of every blessing, tune my heart to sing Thy grace...' },
];

interface SongbookSectionProps {
  songs?: Song[];
}

export default function SongbookSection({ songs = STATIC_SONGS }: SongbookSectionProps) {
  return (
    <div id="liederbuch" className="section-block">
      <div className="section-label">Liederbuch</div>
      <div>
        {/* Search bar — wire up to real search in Phase 4 */}
        <div className="song-search">
          <span style={{ fontSize: 15, color: 'var(--gray)' }}>♩</span>
          <span style={{ fontSize: 12, color: 'var(--gray)' }}>
            Nach Titel, Anfangszeile oder Nummer suchen — Zionslieder...
          </span>
        </div>

        <div className="songs-grid">
          {songs.map((song) => (
            <div key={song.id} className="song-card">
              <div className="s-num">{song.num}</div>
              <div className="s-title">{song.title}</div>
              <div className="s-tag">{song.tag}</div>
              <div className="s-line">{song.firstLine}</div>
            </div>
          ))}
        </div>

        <a href="https://hymnal.sdarm.org/" target="_blank" rel="noopener noreferrer" className="red-link">
          Volles Liederbuch (Zionslieder) — Suche &amp; Liste →
        </a>
      </div>
    </div>
  );
}
