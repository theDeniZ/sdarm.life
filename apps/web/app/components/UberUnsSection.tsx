'use client';

import { useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export default function UberUnsSection() {
  const t = useTranslations('web.uberUns');
  const locale = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  function onMouseDown(e: React.MouseEvent) {
    const el = trackRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    trackRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX);
  }

  function onMouseUp() {
    drag.current.active = false;
    if (trackRef.current) trackRef.current.style.cursor = '';
  }

  const cards = [
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
      title: t('faithTitle'),
      text: t('faithText'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      title: t('sabbathTitle'),
      text: t('sabbathText'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: t('communityTitle'),
      text: t('communityText'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      title: t('worshipTitle'),
      text: t('worshipText'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: t('healthTitle'),
      text: t('healthText'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      ),
      title: t('prophecyTitle'),
      text: t('prophecyText'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      title: t('prayerTitle'),
      text: t('prayerText'),
    },
  ];

  return (
    <section className="uber-uns-section" id="ueber-uns">
      <div className="uber-uns-header">
        <div className="uber-uns-eyebrow">{t('eyebrow')}</div>
        <h2 className="uber-uns-title">{t.rich('title', { em: (chunks) => <em>{chunks}</em> })}</h2>
      </div>

      <div
        className="uber-uns-scroll-track"
        ref={trackRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="uber-uns-grid">
          {cards.map((card, i) => (
            <div key={i} className="uber-uns-card">
              <div className="uber-uns-card-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="uber-uns-card-icon">{card.icon}</div>
              <div className="uber-uns-card-title">{card.title}</div>
              <p className="uber-uns-card-text">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="uber-uns-cta">
        <a href={`/${locale}/about`} className="uber-uns-all-link">
          {t('cta')}
          <svg viewBox="0 0 10 10">
            <polyline points="3,2 7,5 3,8" />
          </svg>
        </a>
      </div>
    </section>
  );
}
