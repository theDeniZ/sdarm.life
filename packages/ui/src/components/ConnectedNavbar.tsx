import Navbar from './Navbar';

const DEFAULT_WEB = 'https://sdarm.life';
const DEFAULT_SONGBOOK = 'https://songs.sdarm.life';
const DEFAULT_EVENTS = 'https://events.sdarm.life';
const DEFAULT_TREASURES = 'https://treasures.sdarm.life';

export default function ConnectedNavbar({ locale = 'de' }: { locale?: string }) {
  const webUrl = process.env.WEB_URL ?? DEFAULT_WEB;
  const songbookUrl = process.env.SONGBOOK_URL ?? DEFAULT_SONGBOOK;
  const eventsUrl = process.env.EVENTS_URL ?? DEFAULT_EVENTS;
  const treasuresUrl = process.env.TREASURES_URL ?? DEFAULT_TREASURES;
  return (
    <Navbar
      locale={locale}
      webUrl={`${webUrl}/${locale}`}
      songbookUrl={`${songbookUrl}/${locale}`}
      eventsUrl={`${eventsUrl}/${locale}`}
      treasuresUrl={`${treasuresUrl}/${locale}`}
    />
  );
}
