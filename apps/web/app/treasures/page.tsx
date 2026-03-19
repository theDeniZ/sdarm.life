import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ComingSoon from '../components/ComingSoon';
import { fetchConfig, toFooterConfig, SONGBOOK_URL } from '../lib/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Schätze — SDARM.life' };

export default async function TreasuresPage() {
  const config = await fetchConfig();
  const footerConfig = config ? toFooterConfig(config) : undefined;

  return (
    <>
      <Navbar songbookUrl={SONGBOOK_URL} />
      <ComingSoon
        title="Schätze"
        subtitle="Geistliche Ressourcen, Bücher und Materialien — bald hier verfügbar."
      />
      <Footer config={footerConfig} apiUrl={process.env.API_URL} songbookUrl={SONGBOOK_URL} />
    </>
  );
}
