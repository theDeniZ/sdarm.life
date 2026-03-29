import type { ReactNode } from 'react';

export interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  decoration?: ReactNode;
  scrollHint?: string;
  cta?: ReactNode;
  centered?: boolean;
}

export default function PageHero({ eyebrow, title, subtitle, decoration, scrollHint, cta, centered }: PageHeroProps) {
  return (
    <section className={`page-hero${centered ? ' page-hero--centered' : ''}`}>
      <div className="page-hero__grain" />
      <div className="page-hero__glow" />
      <div className="page-hero__fog" />
      <div className="page-hero__deco-circle" />
      {decoration && <div className="page-hero__decoration">{decoration}</div>}
      <div className="page-hero__content">
        {eyebrow && <div className="page-hero__eyebrow">{eyebrow}</div>}
        <h1 className="page-hero__title">{title}</h1>
        {subtitle && <p className="page-hero__subtitle">{subtitle}</p>}
        {cta && <div className="page-hero__cta">{cta}</div>}
      </div>
      {scrollHint && (
        <div className="page-hero__scroll-hint" aria-hidden="true">
          <span>{scrollHint}</span>
          <svg viewBox="0 0 14 14">
            <polyline points="2,5 7,10 12,5" />
          </svg>
        </div>
      )}
    </section>
  );
}
