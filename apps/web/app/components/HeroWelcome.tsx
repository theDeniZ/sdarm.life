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
        <span className="hero-welcome-badge">
          <span className="hero-welcome-badge-dot" aria-hidden="true">
            ✦
          </span>
          {t('badge')}
        </span>

        <h1 className="hero-welcome-title">
          {t.rich('title', {
            em: (chunks) => <em>{chunks}</em>,
            br: () => <br />,
          })}
        </h1>

        <p className="hero-welcome-sub">{t('subtitle')}</p>

        <Link href={`/${locale}/about`} className="hero-welcome-cta">
          <span className="hero-welcome-cta-label">{t('ctaPrimary')}</span>
        </Link>
      </div>
    </section>
  );
}
