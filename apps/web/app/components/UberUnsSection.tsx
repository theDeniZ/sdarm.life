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
      // Trinität — Dreieck mit Licht
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 22,20 2,20"/><circle cx="12" cy="13" r="1.5"/><line x1="12" y1="11.5" x2="12" y2="7"/></svg>,
      title: 'Gott, der Vater',
      text: 'Es gibt nur einen Gott, den ewigen Vater, den Schöpfer, eine Persönlichkeit, ein geistiges Wesen, unendlich in Liebe und Weisheit, allmächtig, allgegenwärtig, allwissend, unsterblich.',
    },
    {
      // Kreuz
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="8" x2="20" y2="8"/></svg>,
      title: 'Jesus Christus, der Sohn',
      text: 'Jesus Christus ist der Sohn Gottes, in seiner Natur eins mit dem ewigen Vater. Er starb für unsere Sünden am Kreuz, stand vom Tode wieder auf und fuhr hinauf zum Vater, um für uns zu vermitteln.',
    },
    {
      // Flamme (Pfingsten)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c-4-3-6-7-4-12 1-2 3-3 4-6 1 3 3 4 4 6 2 5 0 9-4 12z"/><path d="M12 22c-2-2-3-4-2-7 0-1 1-2 2-3 1 1 2 2 2 3 1 3 0 5-2 7z"/></svg>,
      title: 'Der Heilige Geist',
      text: 'Der Heilige Geist ist Christi Stellvertreter auf Erden, und ist eines Sinnes mit dem Vater und dem Sohn. Er ist der Erneuerer im Werk der Erlösung.',
    },
    {
      // Aufgeschlagene Bibel
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
      title: 'Die Heilige Schrift',
      text: 'Die Heilige Schrift, bestehend aus dem Alten und Neuen Testament, ist das Wort Gottes. Sie ist die vollständige Offenbarung des Willens Gottes und die einzige unfehlbare Regel des Glaubens und der Praxis.',
    },
    {
      // Zwei Steintafeln
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h7v11H3z"/><path d="M14 4h7v11h-7z"/><line x1="5" y1="8" x2="8" y2="8"/><line x1="5" y1="11" x2="8" y2="11"/><line x1="16" y1="8" x2="19" y2="8"/><line x1="16" y1="11" x2="19" y2="11"/></svg>,
      title: 'Die Zehn Gebote',
      text: 'Das Moralgesetz, die Zehn Gebote aus 2. Mose 20, sind der Ausdruck des Willens Gottes. Das Gesetz ist unveränderlich, bindend für alle Menschen zu allen Zeiten.',
    },
    {
      // Kerze (Sabbat-Licht)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="11" width="6" height="10" rx="1"/><path d="M12 11c0-3 2-5 2-7-1 0-4 2-4 7"/><path d="M12 4c0-1.5 1-2.5 1-2.5S11 2 11 4"/></svg>,
      title: 'Der Sabbat',
      text: 'Das vierte Gebot fordert die Beobachtung des siebenten Tags — Sabbat. Er ist ein heiliger Tag der Ruhe, ein Gedächtnistag der Schöpfung, von Sonnenuntergang Freitag bis Sonnenuntergang Samstag.',
    },
    {
      // Sonne mit Durchstreichung
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4" y1="4" x2="20" y2="20"/></svg>,
      title: 'Sonntagsheiligung',
      text: 'Der erste Tag der Woche war im Altertum der Anbetung der Sonne geweiht. Die Sonntagsheiligung ist nirgends in der Bibel zu finden.',
    },
    {
      // Tempel / Altar mit Bögen
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="2" y1="20" x2="22" y2="20"/><line x1="4" y1="20" x2="4" y2="10"/><line x1="20" y1="20" x2="20" y2="10"/><line x1="12" y1="20" x2="12" y2="10"/><polyline points="2,10 12,4 22,10"/><path d="M8 20v-5a4 4 0 018 0v5"/></svg>,
      title: 'Das Zeremonialgesetz',
      text: 'Das Zeremonialgesetz des Alten Testaments wies auf den Messias. Es kennzeichnete das Werk Christi, und seine Anforderungen endeten am Kreuz.',
    },
    {
      // Offene Hände empfangen Licht
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 11V8a2 2 0 00-4 0v3"/><path d="M14 11V6a2 2 0 00-4 0v5"/><path d="M10 11V8a2 2 0 00-4 0v6c0 3 2 5 6 6 4-1 6-3 6-6v-3a2 2 0 00-4 0"/></svg>,
      title: 'Die Gnade und ihre Mittel',
      text: 'Gott offenbart seine Liebe, indem er dem sündigen Menschen unverdient Erlösung vom Tode durch Jesus Christus anbietet — durch das Wort Gottes, den Heiligen Geist und den Evangeliumsdienst.',
    },
    {
      // Keim / Sprössling (neues Leben)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="22" x2="12" y2="11"/><path d="M12 11c-3-1-6-4-6-8 3 0 6 3 6 8z"/><path d="M12 11c3-1 6-4 6-8-3 0-6 3-6 8z"/></svg>,
      title: 'Die Wiedergeburt',
      text: 'Um von der Sünde errettet zu werden, muss der Mensch die Erfahrung der Wiedergeburt machen. Das neue Leben wird durch den Glauben an Jesus Christus erhalten.',
    },
    {
      // Wasserwellen (Taufe)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L8 10h8L12 2z"/><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>,
      title: 'Die Taufe',
      text: 'Diejenigen, die wiedergeboren wurden, sollten durch Untertauchen im Namen des Vaters, des Sohnes und des Heiligen Geistes getauft werden — als Zeichen der Auferstehung zu neuem Leben.',
    },
    {
      // Schüssel / Waschbecken
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><path d="M4 12c0 4 4 7 8 7s8-3 8-7"/><path d="M9 6c0-2 1-3 3-3s3 1 3 3"/><line x1="12" y1="3" x2="12" y2="12"/></svg>,
      title: 'Die Verordnung der Demut',
      text: 'Die Fußwaschung ist eine Verordnung der Demut, welche dem heiligen Abendmahl vorausgeht, um Demut, Gleichheit, brüderliche Liebe und Einigkeit in Christus zu lehren.',
    },
    {
      // Kelch (Abendmahl)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12l-2 10H8L6 2z"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="10" y1="22" x2="14" y2="22"/><line x1="12" y1="12" x2="12" y2="22"/></svg>,
      title: 'Das heilige Abendmahl',
      text: 'Durch ungesäuertes Brot und unvergorenen Wein gedenkt der Gläubige der Leiden und des Todes Jesu Christi, die den Leib und das Blut Christi versinnbilden.',
    },
    {
      // Waage (Gericht)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M5 6l2 7c0 1.7 1.3 3 3 3s3-1.3 3-3L15 6"/><path d="M21 6l-2 7c0 1.7-1.3 3-3 3s-3-1.3-3-3l2-7"/></svg>,
      title: 'Das Untersuchungsgericht',
      text: 'Die Prophezeiung der 2300 Jahre aus Daniel 8,14 endete 1844, als das Untersuchungsgericht begann — die Prüfung der Berichte über das Leben aller, die sich zu Gott bekannt haben.',
    },
    {
      // Engel / Posaune
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11v5h4l8 4V7L8 11H4z"/><line x1="16" y1="7" x2="16" y2="17"/><path d="M19 9c1 1 1 4 0 6"/></svg>,
      title: 'Die gegenwärtige Wahrheit',
      text: 'Die dreifache Engelsbotschaft von Offenbarung 14 bereitet eine besondere Gruppe von 144 000 Menschen für das zweite Kommen Christi vor.',
    },
    {
      // Schriftrolle / Prophezeiung
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/></svg>,
      title: 'Die Gabe der Prophezeiung',
      text: 'In diesen letzten Tagen wurde die Gabe der Prophezeiung in Christi Gemeinde wiederhergestellt — nicht als Ersatz der Bibel, sondern als Führer zur rechten Auslegung des Wortes Gottes.',
    },
    {
      // Zwei Ringe (Ehe)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/></svg>,
      title: 'Die Ehe',
      text: 'Die Ehe wurde von Gott eingesetzt, um zwei Menschen lebenslang zu binden. Scheidung zur Wiederheirat sowie Verbindung mit Ungläubigen stimmen nicht mit den göttlichen Grundsätzen überein.',
    },
    {
      // Blatt (Gesundheit / Natur)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c0 0-8-4-8-12 5 0 8 3 8 3s3-3 8-3c0 8-8 12-8 12z"/><line x1="12" y1="22" x2="12" y2="13"/></svg>,
      title: 'Gesundheits- und Kleiderreform',
      text: 'Weil der Körper der Tempel des Heiligen Geistes ist, schützen Christen ihre Gesundheit durch Naturgesetze. Bescheidenheit in der Kleidung zeugt vom Charakter.',
    },
    {
      // Schild / Schutzschild (Obrigkeit / Gewissen)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9,12 11,14 15,10"/></svg>,
      title: 'Haltung zur irdischen Regierung',
      text: 'Der Christ respektiert göttliche und menschliche Autorität und gehorcht allen gerechten Gesetzen. Wo menschliche Gesetze im Widerspruch zu Gottes Gesetz stehen, gehorcht er Gott.',
    },
    {
      // Kirchengebäude
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="10" y1="4" x2="14" y2="4"/><polyline points="9,22 9,13 15,13 15,22"/></svg>,
      title: 'Der Leib Christi, seine Gemeinde',
      text: 'Die Gemeinde Christi ist ein sichtbarer und organisierter Leib. Sie hat die Vollmacht, Mitglieder durch die Taufe aufzunehmen und aus gegebenem Anlass auszuschließen.',
    },
    {
      // Gabenbrot / Weizenkorn
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
      title: 'Zehnten und Gaben',
      text: 'Zehnten und Gaben zur Unterstützung des Predigtamtes und der Verkündigung des Evangeliums zu geben, ist eines Christen Pflicht.',
    },
    {
      // Wolke mit herabkommenden Strahlen (Wiederkunft)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="12" y1="20" x2="12" y2="14"/><polyline points="9,17 12,14 15,17"/></svg>,
      title: 'Das zweite Kommen Christi',
      text: 'Das zweite Kommen Christi wird buchstäblich, persönlich, sichtbar, hörbar und weltweit sein. Die menschliche Gnadenzeit endet kurz zuvor.',
    },
    {
      // Schlafende Figur / Grab (Zustand der Toten)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><line x1="8" y1="22" x2="8" y2="13"/><line x1="16" y1="22" x2="16" y2="13"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="10" y1="3.5" x2="14" y2="3.5"/></svg>,
      title: 'Natur des Menschen und Zustand der Toten',
      text: 'Beim Tod fällt der Mensch in einen Schlaf — einen Zustand von Bewusstlosigkeit. Der Tote bleibt im Grab bis zur Auferstehung der Gerechten bei der Wiederkunft Christi.',
    },
    {
      // Sanduhr (tausend Jahre)
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="2" x2="19" y2="2"/><line x1="5" y1="22" x2="19" y2="22"/><path d="M5 2l7 9 7-9"/><path d="M5 22l7-9 7 9"/></svg>,
      title: 'Das Millennium',
      text: 'Nach dem zweiten Kommen Christi wird eine Periode von tausend Jahren sein. Die Gerechten sind mit Gott im Himmel, während die Gottlosen im Staub der wüsten Erde verharren.',
    },
    {
      // Erde mit Kreuz / Neues Jerusalem
      icon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="10" y1="4" x2="14" y2="4"/></svg>,
      title: 'Die neue Erde',
      text: 'Nachdem die Erde durch Feuer von Sünde gereinigt ist, wird Gott alle Dinge neu machen. Die neue Erde wird das ewige Heim der Erlösten werden.',
    },
  ];

  return (
    <section className="uber-uns-section" id="ueber-uns">
      <div className="uber-uns-header">
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
              <div className="uber-uns-card-top">
                <div className="uber-uns-card-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="uber-uns-card-icon">{card.icon}</div>
              </div>
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
