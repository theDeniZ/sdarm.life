import Footer from './Footer';
import type { FooterConfig } from './Footer';

const DEFAULT_API = 'https://api.sdarm.life/api/v1';
const DEFAULT_WEB = 'https://sdarm.life';
const DEFAULT_SONGBOOK = 'https://songs.sdarm.life';
const DEFAULT_EVENTS = 'https://events.sdarm.life';
const DEFAULT_TREASURES = 'https://treasures.sdarm.life';

async function fetchFooterConfig(apiUrl: string): Promise<FooterConfig | undefined> {
  try {
    const res = await fetch(`${apiUrl}/config`, { cache: 'no-store' });
    if (!res.ok) return undefined;
    const data = (await res.json()) as Record<string, string | null>;
    return {
      donation_url: data.donation_url ?? undefined,
      facebook_url: data.facebook_url ?? undefined,
      whatsapp_url: data.whatsapp_url ?? undefined,
      instagram_url: data.instagram_url ?? undefined,
      youtube_url: data.youtube_url ?? undefined,
    };
  } catch {
    return undefined;
  }
}

export default async function ConnectedFooter() {
  const apiUrl = process.env.API_URL ?? DEFAULT_API;
  const webUrl = process.env.WEB_URL ?? DEFAULT_WEB;
  const songbookUrl = process.env.SONGBOOK_URL ?? DEFAULT_SONGBOOK;
  const eventsUrl = process.env.EVENTS_URL ?? DEFAULT_EVENTS;
  const treasuresUrl = process.env.TREASURES_URL ?? DEFAULT_TREASURES;
  const config = await fetchFooterConfig(apiUrl);
  return (
    <Footer
      config={config}
      apiUrl={apiUrl}
      webUrl={webUrl}
      songbookUrl={songbookUrl}
      eventsUrl={eventsUrl}
      treasuresUrl={treasuresUrl}
    />
  );
}
