'use client';

import { useRef } from 'react';

export default function UberUnsSection() {
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

  return (
    <section className="uber-uns-section" id="ueber-uns">
      <div className="uber-uns-header">
        <div className="uber-uns-eyebrow">Wer wir sind</div>
        <h2 className="uber-uns-title">
          Über <em>uns</em>
        </h2>
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
          <div className="uber-uns-card">
            <div className="uber-uns-card-num">01</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Unsere Glaubensgrundlage</div>
            <p className="uber-uns-card-text">
              Wir glauben an die vollständige Autorität der Heiligen Schrift als Grundlage aller Lehre und des Lebens.
              Die Bibel ist unser einziger Maßstab für Glauben und Praxis — unveränderlich und zeitlos.
            </p>
          </div>

          <div className="uber-uns-card">
            <div className="uber-uns-card-num">02</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Der Siebente Tag</div>
            <p className="uber-uns-card-text">
              Wir halten den biblischen Schabbat — den siebenten Tag der Woche — als heiligen Ruhetag, wie es Gott seit
              der Schöpfung eingesetzt und in den Zehn Geboten befohlen hat.
            </p>
          </div>

          <div className="uber-uns-card">
            <div className="uber-uns-card-num">03</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Gemeinschaft &amp; Reformation</div>
            <p className="uber-uns-card-text">
              Als Reformationsbewegung innerhalb der Adventgemeinde setzen wir uns für eine vollständige Rückkehr zu den
              Grundsätzen der Bibel ein — in Lehre, Lebensstil und Gottesdienst.
            </p>
          </div>

          <div className="uber-uns-card">
            <div className="uber-uns-card-num">04</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Gottesdienst &amp; Anbetung</div>
            <p className="uber-uns-card-text">
              Im Mittelpunkt unseres Lebens steht die Anbetung Gottes — in Geist und Wahrheit, nach dem Vorbild der
              Heiligen Schrift und der frühen Christengemeinde.
            </p>
          </div>

          <div className="uber-uns-card">
            <div className="uber-uns-card-num">05</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Gesundheit &amp; Natur</div>
            <p className="uber-uns-card-text">
              Wir pflegen einen Lebensstil, der den Körper als Tempel Gottes achtet — natürliche Ernährung, Bewegung und
              Enthaltsamkeit als Teil ganzheitlicher christlicher Lebensführung.
            </p>
          </div>

          <div className="uber-uns-card">
            <div className="uber-uns-card-num">06</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Prophetie &amp; Endzeit</div>
            <p className="uber-uns-card-text">
              Die biblischen Prophezeiungen leiten unsere Gemeinschaft. Wir leben in der Erwartung der baldigen
              Wiederkunft Christi und bereiten uns und andere darauf vor.
            </p>
          </div>

          <div className="uber-uns-card">
            <div className="uber-uns-card-num">07</div>
            <div className="uber-uns-card-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="uber-uns-card-title">Gebet &amp; Andacht</div>
            <p className="uber-uns-card-text">
              Persönliches Gebet und tägliches Bibelstudium sind die Grundpfeiler unseres geistlichen Lebens. In der
              Stille begegnen wir dem lebendigen Gott.
            </p>
          </div>
        </div>
      </div>

      <div className="uber-uns-cta">
        <a href="/about" className="uber-uns-all-link">
          Mehr über uns erfahren
          <svg viewBox="0 0 10 10">
            <polyline points="3,2 7,5 3,8" />
          </svg>
        </a>
      </div>
    </section>
  );
}
