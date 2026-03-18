'use client';

import { useEffect, useRef } from 'react';

// Kept for API compatibility
export interface NewsPost {
  id: string;
  title: string;
  date: string;
  author: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

export default function NewsSection() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll<HTMLElement>('.masonry-item'));
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('is-visible'), i * 80);
    });
  }, []);

  return (
    <section className="events-section" id="neuigkeiten">
      <div className="neues-header">
        <div className="neues-eyebrow">Aktuelles aus der Gemeinde</div>
        <h2 className="neues-title">
          <em>Neues</em>
        </h2>
        <p className="neues-subtitle">Bücher, Lieder, Predigten, Zitate — alles Neue aus unserer Gemeinschaft.</p>
      </div>

      <div className="masonry-wrap">
        <div className="masonry-grid" ref={gridRef}>
          {/* 1: Book — 3:4 */}
          <div className="masonry-item ratio-3-4">
            <div className="img-wrap">
              <div className="nc nc--book">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-bigicon">
                  <svg viewBox="0 0 24 24">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                  </svg>
                </div>
                <div className="nc-bookdeco">
                  <div className="nc-bookdeco-text">
                    Путь ко Христу
                    <br />
                    <br />
                    Ellen G. White
                  </div>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Bibliothek · Neu</div>
                  <div className="nc-title">Путь ко Христу</div>
                  <div className="nc-sub">Ellen G. White — jetzt in der Bibliothek verfügbar</div>
                  <a href="#" className="nc-cta">
                    Lesen{' '}
                    <svg viewBox="0 0 10 10">
                      <polyline points="3,2 7,5 3,8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 2: Merch — 1:1 */}
          <div className="masonry-item ratio-1-1">
            <div className="img-wrap">
              <div className="nc nc--merch">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-bigicon">
                  <svg viewBox="0 0 24 24">
                    <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z" />
                  </svg>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Kollektion · Neu</div>
                  <div className="nc-title">Neues Design</div>
                  <div className="nc-sub">Reformationsbewegung 2026 — limitierte Auflage</div>
                  <a href="#" className="nc-cta">
                    Ansehen{' '}
                    <svg viewBox="0 0 10 10">
                      <polyline points="3,2 7,5 3,8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 3: Quote */}
          <div className="masonry-item ratio-quote">
            <div className="img-wrap">
              <div className="nc nc--quote">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-quote-accent">
                  <div className="nc-quote-bar" />
                  <div className="nc-quote-glyph">&ldquo;</div>
                </div>
                <div className="nc-body">
                  <div className="nc-title">Dein Wort ist meines Fußes Leuchte und ein Licht auf meinem Wege.</div>
                  <div className="nc-ref">Psalm 119,105</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4: Song — 9:16 */}
          <div className="masonry-item ratio-9-16">
            <div className="img-wrap">
              <div className="nc nc--song">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-wave">
                  {[30, 55, 80, 45, 90, 60, 75, 35, 65, 85, 50, 70, 40, 95, 55, 30].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="nc-bigicon">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Lieder · Neu</div>
                  <div className="nc-title">Ich weiß, an wen ich glaube</div>
                  <div className="nc-sub">
                    Adventlied · Nr. 214
                    <br />
                    Jetzt in der Liederbibliothek
                  </div>
                  <a href="/lieder" className="nc-cta">
                    Zum Lied{' '}
                    <svg viewBox="0 0 10 10">
                      <polyline points="3,2 7,5 3,8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 5: Sermon — 3:4 */}
          <div className="masonry-item ratio-3-4">
            <div className="img-wrap">
              <div className="nc nc--sermon">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-bigicon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Predigt · März 2026</div>
                  <div className="nc-title">Der Sabbat — Zeichen der Treue</div>
                  <div className="nc-sub">
                    Br. Daniel Hoffmann
                    <br />
                    Pforzheim, 15. März 2026
                  </div>
                  <a href="#" className="nc-cta">
                    Lesen{' '}
                    <svg viewBox="0 0 10 10">
                      <polyline points="3,2 7,5 3,8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 6: Bible Study — 1:1 */}
          <div className="masonry-item ratio-1-1">
            <div className="img-wrap">
              <div className="nc nc--study">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-bigicon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Bibelstudium · Neu</div>
                  <div className="nc-title">Das Gesetz Gottes</div>
                  <div className="nc-sub">Neue Studienserie — 7 Lektionen</div>
                  <a href="#" className="nc-cta">
                    Studieren{' '}
                    <svg viewBox="0 0 10 10">
                      <polyline points="3,2 7,5 3,8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 7: Event — 16:9 */}
          <div className="masonry-item ratio-16-9" style={{ position: 'relative' }}>
            <a
              href="#"
              style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'block' }}
              aria-label="Zum Kalender"
            />
            <div className="img-wrap">
              <div className="nc nc--event">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-bigicon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Schabbat · Nächster</div>
                  <div className="nc-title">Gottesdienst Pforzheim</div>
                  <div className="nc-sub">Sa. 22. März 2026 · 15:00 Uhr · Pforzheim, BW</div>
                </div>
              </div>
            </div>
          </div>

          {/* 8: Badge/Pin — 1:1 */}
          <div className="masonry-item ratio-1-1">
            <div className="img-wrap">
              <div className="nc nc--badge">
                <div className="nc-bg" />
                <div className="nc-veil" />
                <div className="nc-bigicon" style={{ opacity: 0.08 }}>
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="7" />
                  </svg>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <svg viewBox="0 0 120 140" width="80" style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.6))' }}>
                    <circle
                      cx="60"
                      cy="52"
                      r="38"
                      fill="rgba(18,13,7,.95)"
                      stroke="rgba(201,169,110,.38)"
                      strokeWidth="1.6"
                    />
                    <circle cx="60" cy="52" r="30" fill="none" stroke="rgba(201,169,110,.1)" strokeWidth=".7" />
                    <text
                      x="60"
                      y="47"
                      textAnchor="middle"
                      fontFamily="'Bebas Neue',sans-serif"
                      fontSize="14"
                      fill="rgba(201,169,110,.9)"
                      letterSpacing="1.2"
                    >
                      SDARM
                    </text>
                    <text
                      x="60"
                      y="61"
                      textAnchor="middle"
                      fontFamily="'Cormorant Garamond',serif"
                      fontSize="7"
                      fill="rgba(201,169,110,.48)"
                      letterSpacing="3"
                      fontStyle="italic"
                    >
                      .life
                    </text>
                    <line x1="60" y1="90" x2="60" y2="132" stroke="rgba(201,169,110,.5)" strokeWidth="1.4" />
                    <circle cx="60" cy="134" r="2.5" fill="rgba(201,169,110,.6)" />
                    <path d="M54 124 Q60 128 66 124" fill="none" stroke="rgba(201,169,110,.4)" strokeWidth="1.2" />
                  </svg>
                </div>
                <div className="nc-body">
                  <div className="nc-label">Kollektion · Neu</div>
                  <div className="nc-title">Anstecknadel Gold</div>
                  <div className="nc-sub">Ø 25mm · vergoldet · 3 €</div>
                  <a href="#" className="nc-cta">
                    Bestellen{' '}
                    <svg viewBox="0 0 10 10">
                      <polyline points="3,2 7,5 3,8" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
