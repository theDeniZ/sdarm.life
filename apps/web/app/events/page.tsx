import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ComingSoon from '../components/ComingSoon';
import { fetchConfig, toFooterConfig, SONGBOOK_URL } from '../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Events — SDARM.life' };

export default async function EventsPage() {
  const config = await fetchConfig();
  const footerConfig = config ? toFooterConfig(config) : undefined;

  return (
    <>
      <Navbar songbookUrl={SONGBOOK_URL} />
      <ComingSoon
        title="Events"
        subtitle="Veranstaltungen, Seminare und Gottesdienste — bald hier verfügbar."
      />
      <Footer config={footerConfig} apiUrl={process.env.API_URL} songbookUrl={SONGBOOK_URL} />
    </>
  );
}
