import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PlanetEarth from './PlanetEarth';

export default async function HeroWelcome({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'web.heroWelcome' });

  return (
    <section className="hero-welcome" data-nav-overlay="dark">
      {/* Cosmic atmosphere — real 3D Earth (Three.js, self-hosted textures) +
          star scatter. Auto-rotates with cloud layer parallax. */}
      <div className="hero-welcome-bg" aria-hidden="true">
        <div className="hero-welcome-planet">
          <PlanetEarth />
        </div>
        <div className="hero-welcome-grain" />
      </div>

      <div className="hero-welcome-content">
        <h1 className="hero-welcome-title">
          {t.rich('title', {
            em: (chunks) => <em>{chunks}</em>,
            br: () => <br />,
          })}
        </h1>

        <p className="hero-welcome-sub">{t('subtitle')}</p>

        <Link href={`/${locale}/about`} className="hero-welcome-cta">
          <span className="hero-welcome-cta-label">{t('ctaPrimary')}</span>
          {/* Two arrows in a clipped slot: on hover the first leaves to the
              right and the second arrives from the left, so the mark moves
              rather than just nudging. */}
          <span className="hero-welcome-cta-go" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
