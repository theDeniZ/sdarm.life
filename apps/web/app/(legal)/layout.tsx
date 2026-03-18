import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer apiUrl={process.env.API_URL ?? 'https://api.sdarm.life/api/v1'} />
    </>
  );
}
