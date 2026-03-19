import Navbar from './Navbar';

const DEFAULT_WEB = 'https://sdarm.life';
const DEFAULT_SONGBOOK = 'https://songs.sdarm.life';
const DEFAULT_EVENTS = 'https://events.sdarm.life';
const DEFAULT_TREASURES = 'https://treasures.sdarm.life';

export default function ConnectedNavbar() {
  const webUrl = process.env.WEB_URL ?? DEFAULT_WEB;
  const songbookUrl = process.env.SONGBOOK_URL ?? DEFAULT_SONGBOOK;
  const eventsUrl = process.env.EVENTS_URL ?? DEFAULT_EVENTS;
  const treasuresUrl = process.env.TREASURES_URL ?? DEFAULT_TREASURES;
  return <Navbar webUrl={webUrl} songbookUrl={songbookUrl} eventsUrl={eventsUrl} treasuresUrl={treasuresUrl} />;
}
