import Link from 'next/link';
import Footer from '../components/Footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <div className="nav-logo">
          <Link href="/" className="logo-text">
            <span className="red">sdarm</span>.life
          </Link>
        </div>
      </nav>
      {children}
      <Footer apiUrl={process.env.API_URL ?? 'https://api.sdarm.life/api/v1'} />
    </>
  );
}
